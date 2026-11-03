import {confessionService,ConfessionError} from '../shared/confession-service.js';
export function confessionStore(db){
 const run=(sql,...args)=>db.prepare(sql).bind(...args).run(), all=async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results, first=(sql,...args)=>db.prepare(sql).bind(...args).first();
 return {
  get:id=>first('SELECT * FROM confessions WHERE id=?',id),
  replyFor:id=>first('SELECT * FROM confessions WHERE parent=?',id),
  list:(u,l)=>all("SELECT c.* FROM confessions c WHERE c.kind='confession' AND c.status='approved' AND c.closed=0 AND c.author<>? AND c.language=? AND c.claimed_until<=? AND NOT EXISTS(SELECT 1 FROM confessions r WHERE r.parent=c.id) AND NOT EXISTS(SELECT 1 FROM confession_blocks b WHERE (b.actor=? AND b.target=c.author) OR (b.target=? AND b.actor=c.author)) ORDER BY c.created LIMIT 40",u,l,Date.now(),u,u),
  reserved:u=>all("SELECT c.* FROM confessions c WHERE c.claimed_by=? AND c.claimed_until>? AND c.status='approved' AND c.closed=0 AND NOT EXISTS(SELECT 1 FROM confessions r WHERE r.parent=c.id)",u,Date.now()),
  claim:async(id,u,now,until)=>Number((await run("UPDATE confessions SET claimed_by=?,claimed_until=CASE WHEN claimed_by=? AND claimed_until>? THEN claimed_until ELSE ? END WHERE id=? AND kind='confession' AND status='approved' AND closed=0 AND (claimed_until<=? OR claimed_by=?) AND NOT EXISTS(SELECT 1 FROM confessions r WHERE r.parent=?)",u,u,now,until,id,now,u,id)).meta.changes)===1,
  mine:u=>all('SELECT * FROM confessions WHERE author=? ORDER BY created DESC LIMIT 100',u),
  queue:()=>all("SELECT * FROM confessions WHERE status IN ('pending','reported') ORDER BY priority,created LIMIT 100"),
  reports:()=>all("SELECT id,target,reason,created FROM confession_reports WHERE status='open' ORDER BY created LIMIT 100"),
  recent:async u=>(await first('SELECT count(*) n FROM confessions WHERE author=? AND created>?',u,Date.now()-3600000)).n,
  recentReports:async u=>(await first('SELECT count(*) n FROM confession_reports WHERE reporter=? AND created>?',u,Date.now()-3600000)).n,
  blocked:async(a,b)=>!!await first('SELECT 1 FROM confession_blocks WHERE (actor=? AND target=?) OR (actor=? AND target=?)',a,b,b,a),
  async insert(r){const keys=Object.keys(r),values=Object.values(r);try{const result=await run(`INSERT INTO confessions (${keys.join(',')}) SELECT ${keys.map(()=>'?').join(',')}${r.parent?" WHERE EXISTS(SELECT 1 FROM confessions WHERE id=? AND status='approved' AND closed=0 AND claimed_by=? AND claimed_until>?)":''}`, ...values,...(r.parent?[r.parent,r.author,Date.now()]:[]));return Number(result.meta.changes)===1;}catch(e){if(/UNIQUE|constraint/i.test(String(e)))return false;throw e;}},
  close:(id,u)=>run('UPDATE confessions SET closed=1 WHERE id=? AND author=?',id,u),
  thank:id=>run('UPDATE confessions SET thanked=1 WHERE id=?',id),
  remove:async id=>{await db.batch([db.prepare('DELETE FROM confessions WHERE parent=?').bind(id),db.prepare('DELETE FROM confessions WHERE id=?').bind(id)]);},
  audit:(actor,action,target,note)=>run('INSERT INTO confession_audit(id,actor,action,target,note,created) VALUES(?,?,?,?,?,?)',crypto.randomUUID(),actor,action,target,note,Date.now()),
  async report(r){await db.batch([db.prepare("INSERT OR IGNORE INTO confession_reports(id,target,reporter,reason,created,status) VALUES(?,?,?,?,?,'open')").bind(r.id,r.target,r.reporter,r.reason,r.created),db.prepare("UPDATE confessions SET status='reported' WHERE id=?").bind(r.target)]);},
  block:(a,b)=>run('INSERT OR IGNORE INTO confession_blocks(actor,target) VALUES(?,?)',a,b),
  async moderate(id,status,actor,note){await db.batch([db.prepare('UPDATE confessions SET status=? WHERE id=?').bind(status,id),db.prepare("UPDATE confession_reports SET status='reviewed' WHERE target=?").bind(id),db.prepare('INSERT INTO confession_audit(id,actor,action,target,note,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,status,id,note,Date.now())]);}
 };
}
export async function confessionAPI(request,env,user){
 const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 const url=new URL(request.url), email=request.headers.get('oai-authenticated-user-email')?.toLowerCase(), moderator=!!email&&String(env.CONFESSION_MODERATOR_EMAILS||'').toLowerCase().split(',').map(s=>s.trim()).includes(email);
 if(!env.DB)return reply({error:'unavailable'},503);
 if(!['GET','POST'].includes(request.method))return reply({error:'method_not_allowed'},405);
 let b={},audio=null,action;
 try{
  if(request.method==='GET'){b=Object.fromEntries(url.searchParams);action=b.action||'status';if(!['status','list','mine','read','queue','audio'].includes(action))throw new ConfessionError('method_not_allowed',405);}
  else{
   if(request.headers.get('origin')!==url.origin)throw new ConfessionError('origin_not_allowed',403);
   if(Number(request.headers.get('content-length'))>6*1024*1024)throw new ConfessionError('too_large',413);
   const type=request.headers.get('content-type')||'';
   // Read a bounded stream before multipart/JSON parsing, including requests without Content-Length.
   const reader=request.body?.getReader();let size=0,chunks=[];if(!reader)throw new ConfessionError('invalid');
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>6*1024*1024){await reader.cancel();throw new ConfessionError('too_large',413);}chunks.push(value);}
   const bounded=new Response(new Blob(chunks),{headers:{'Content-Type':type}});
   if(type.startsWith('multipart/form-data')){const form=await bounded.formData();b=JSON.parse(form.get('data'));audio=form.get('audio');if(!audio||typeof audio==='string'||audio.size>5*1024*1024||audio.size<20||!/^audio\/(webm|ogg|mp4|mpeg|wav|x-wav)(;|$)/.test(audio.type))throw new ConfessionError('invalid_audio');if(!env.BUCKET)throw new ConfessionError('audio_unavailable',503);b.audioType=audio.type.split(';')[0];}
   else if(type.startsWith('application/json')){if(size>16000)throw new ConfessionError('too_large',413);b=await bounded.json();delete b.audioType;}
   else throw new ConfessionError('json_required',415);
   action=b.action;if(audio&&action!=='share')throw new ConfessionError('invalid');if(!['open','share','reply','close','thank','report','block','moderate','delete'].includes(action))throw new ConfessionError('invalid');
  }
  const store=confessionStore(env.DB),remove=store.remove;store.remove=async id=>{await env.BUCKET?.delete('confessions/'+id);await remove(id);};const result=await confessionService({store,user,moderator},action,b);
  if(action==='audio'){const file=await env.BUCKET?.get('confessions/'+result.id);if(!file)throw new ConfessionError('not_found',404);return new Response(file.body,{headers:{'Content-Type':result.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
  if(audio){try{await env.BUCKET.put('confessions/'+result.item.id,audio.stream(),{httpMetadata:{contentType:b.audioType}});}catch(e){await store.remove(result.item.id);throw e;}}
  return reply(result);
 }catch(e){return reply({error:e instanceof ConfessionError?e.message:'unavailable'},e instanceof ConfessionError?e.status:503);}
}
