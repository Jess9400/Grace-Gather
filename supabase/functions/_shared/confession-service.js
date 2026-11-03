import {screenConfession,validateConfession,REPORT_REASONS} from './confession-policy.js';
export class ConfessionError extends Error {constructor(code,status=400){super(code);this.status=status;}}
const fail=(code,status=400)=>{throw new ConfessionError(code,status);};
export function publicConfession(row,user,moderator=false){
 const {id,kind,parent,body,theme,response_type,language,status,created,closed,thanked,audio_type,claimed_until}=row;
 return {id,kind,parent,body:status==='reported'&&!moderator?'':body,theme,responseType:response_type,language,status,created,closed:!!closed,thanked:!!thanked,hasAudio:!!audio_type&&(status!=='reported'||moderator),mine:row.author===user,reservedUntil:claimed_until||null,...(moderator?{priority:row.priority,signals:JSON.parse(row.signals||'[]')}:{} )};
}
// Store operations enforce the reply reservation atomically. No journal data enters this service.
export async function confessionService({store,user,moderator=false},action,b={}) {
 if(!user)fail('sign_in_required',401);
 const expose=r=>publicConfession(r,user,moderator);
 const get=async id=>{if(typeof id!=='string'||!/^[a-z0-9-]{1,64}$/.test(id))fail('not_found',404);const r=await store.get(id);if(!r)fail('not_found',404);return r;};
 async function access(r){
  if(moderator||r.author===user)return true;
  const parent=r.kind==='reply'?await get(r.parent):r;
  const reply=await store.replyFor(parent.id);
  if(parent.author===user)return r.kind!=='reply'||r.status==='approved'||r.status==='reported';
  if(reply?.author===user)return r.kind==='confession'&&r.status==='approved'||r.author===user;
  return r.kind==='confession'&&r.status==='approved'&&!r.closed&&!reply&&r.claimed_by===user&&r.claimed_until>Date.now()&&!await store.blocked(user,r.author);
 }
 if(action==='status')return {moderator,reviewRequired:true};
 if(action==='list'){if(!['en','pt','es','ru'].includes(b.language))fail('invalid');const rows=await store.list(user,b.language);return {reserved:(await store.reserved(user)).map(expose),items:rows.map(({id,theme,response_type,language,audio_type})=>({id,theme,responseType:response_type,language,hasAudio:!!audio_type}))};}
 if(action==='mine')return {items:(await store.mine(user)).map(expose)};
 if(action==='queue') {if(!moderator)fail('forbidden',403);await store.audit(user,'queue_view',null,'');return {items:(await store.queue()).map(expose),reports:await store.reports()};}
 if(action==='open'){
  const r=await get(b.id);if(r.author===user||r.kind!=='confession'||await store.blocked(user,r.author))fail('not_available',409);
  if(!await store.claim(r.id,user,Date.now(),Date.now()+6*3600000))fail('not_available',409);
  return {item:expose(await get(r.id)),reply:null};
 }
 if(action==='share'||action==='reply'){
  if(await store.recent(user)>=5)fail('rate_limited',429);
  const data=validateConfession(b);if(!data||(!data.body&&!b.audioType)||data.body.length<(!b.audioType?3:0))fail('invalid');
  const kind=action==='reply'?'reply':'confession';
  let parent=null;
  if(kind==='reply'){parent=await get(b.id);if(parent.kind!=='confession'||parent.author===user||parent.status!=='approved'||parent.closed||parent.claimed_by!==user||parent.claimed_until<=Date.now()||await store.blocked(user,parent.author))fail('not_available',409);if(b.audioType)fail('invalid');data.theme=parent.theme;data.response_type=parent.response_type;data.language=parent.language;}
  const screened=screenConfession(data.body,kind,!!b.audioType), row={id:crypto.randomUUID(),kind,parent:parent?.id??null,author:user,...data,status:'pending',priority:screened.priority,signals:JSON.stringify(screened.signals),closed:0,thanked:0,claimed_by:null,claimed_until:0,audio_type:b.audioType||null,created:Date.now()};
  if(!await store.insert(row))fail('not_available',409);
  return {item:expose(row),supportSuggested:screened.signals.includes('safety_context')||screened.signals.includes('threat')};
 }
 const row=await get(b.id);
 if(!await access(row))fail('not_found',404);
 if(action==='read'||action==='audio'){
  if(moderator)await store.audit(user,action+'_view',row.id,'');
  if(action==='audio'){if(!row.audio_type||row.status==='reported'&&!moderator)fail('not_found',404);return {id:row.id,type:row.audio_type};}
  const reply=row.kind==='confession'?await store.replyFor(row.id):null;
  return {item:expose(row),reply:reply&&await access(reply)?expose(reply):null};
 }
 if(action==='close'||action==='delete'){
  if(row.author!==user||row.kind!=='confession')fail('forbidden',403);
  if(action==='delete'){await store.remove(row.id);return {ok:true,removed:row.id};}
  await store.close(row.id,user);return {ok:true};
 }
 if(action==='thank'){
  if(row.kind!=='reply'||row.status!=='approved'||(await get(row.parent)).author!==user)fail('forbidden',403);
  await store.thank(row.id);return {ok:true};
 }
 if(action==='report'){
  if(row.author===user||!REPORT_REASONS.includes(b.reason))fail('invalid');
  if(await store.recentReports(user)>=10)fail('rate_limited',429);
  await store.report({id:crypto.randomUUID(),target:row.id,reporter:user,reason:b.reason,created:Date.now()});
  return {ok:true};
 }
 if(action==='block'){
  if(row.author===user)fail('invalid');await store.block(user,row.author);return {ok:true};
 }
 if(action==='moderate'){
  if(!moderator)fail('forbidden',403);
  if(row.author===user)fail('self_review',403);
  if(!['approved','rejected'].includes(b.decision)||typeof b.note!=='string'||b.note.trim().length<5||b.note.length>500)fail('invalid');
  await store.moderate(row.id,b.decision,user,b.note.trim());return {ok:true};
 }
 fail('not_found',404);
}
