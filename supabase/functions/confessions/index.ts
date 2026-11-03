import { serve, identity, json } from '../_shared/http.ts';
import { confessionService, ConfessionError } from '../_shared/confession-service.js';
const methods=['get','replyFor','list','reserved','mine','queue','reports','recent','recentReports','blocked','claim','insert','close','thank','remove','audit','report','block','moderate'];
serve(async req=>{
 const {user,service}=await identity(req);
 const {data:role}=await service.rpc('staff_role_for_confession',{uid:user.id});
 // Prefer an explicit verified-email allowlist; private schema roles are optional.
 const emails=(Deno.env.get('CONFESSION_MODERATOR_EMAILS')||'').toLowerCase().split(',').map(s=>s.trim());
 const moderator=!!user.email_confirmed_at&&!!user.email&&emails.includes(user.email.toLowerCase())||['admin','moderator'].includes(role||'');
 try {
  if(Number(req.headers.get('content-length'))>6*1024*1024)return json({error:'too_large'},413);
  const reader=req.body?.getReader();if(!reader)return json({error:'invalid'},400);
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>6*1024*1024){await reader.cancel();return json({error:'too_large'},413);}chunks.push(value);}
  const type=req.headers.get('content-type')||'';const body=new Response(new Blob(chunks),{headers:{'Content-Type':type}});
  let b:Record<string,any>,audio:File|null=null;
  if(type.startsWith('multipart/form-data')){const f=await body.formData();b=JSON.parse(String(f.get('data')));const file=f.get('audio');if(!(file instanceof File)||file.size<20||file.size>5242880||!/^audio\/(mp4|webm|ogg|mpeg|wav)(;|$)/.test(file.type))return json({error:'invalid_audio'},400);audio=file;b.audioType=file.type.split(';')[0];}
  else{if(size>16000)return json({error:'too_large'},413);b=await body.json();delete b.audioType;}
  const action=b.action;if(audio&&action!=='share')return json({error:'invalid'},400);if(typeof action!=='string')return json({error:'invalid'},400);
  const store=Object.fromEntries(methods.map(op=>[op,async(...a:unknown[])=>{const {data,error}=await service.rpc('confession_store',{op,a});if(error)throw error;return data;}]));
  const bucket=service.storage.from('confession-audio');
  const remove=store.remove;store.remove=async(id:unknown)=>{const {error}=await bucket.remove([String(id)]);if(error)throw error;return remove(id);};
  const result=await confessionService({store,user:user.id,moderator},action,b);
  if(action==='audio'){const signed=await bucket.createSignedUrl(result.id,60);if(signed.error)throw signed.error;return json({url:signed.data.signedUrl});}
  if(audio){const {error}=await bucket.upload(result.item.id,audio,{contentType:b.audioType,upsert:false});if(error){await store.remove(result.item.id);throw error;}}
  return json(result);
 }catch(e){return json({error:e instanceof ConfessionError?e.message:'unavailable'},e instanceof ConfessionError?e.status:503);}
});
