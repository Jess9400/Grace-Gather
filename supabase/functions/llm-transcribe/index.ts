import { serve, identity, json } from '../_shared/http.ts';
import { AI_CONSENT_VERSION, readBounded } from '../_shared/journey-policy.js';
import { qwen, aiError, reserveAI } from '../_shared/qwen.ts';
serve(async req=>{
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  const {user,service,client}=await identity(req);
  try{
    const permission=await client.rpc('ai_journal_permission');
    if(permission.error || permission.data!==true)throw Error('consent_required');
    const blob=await readBounded(req,6*1024*1024);
    const form=await new Response(blob,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();
    if(form.get('consentVersion')!==AI_CONSENT_VERSION)throw Error('consent_required');
    const file=form.get('audio'),language=form.get('language');
    if(!(file instanceof File)||file.size<20||file.size>5*1024*1024||!['en','pt','es','ru'].includes(String(language)))throw Error('invalid_audio');
    // Native recording is M4A (MP4 container). Validate its header as well as the size.
    const bytes=new Uint8Array(await file.arrayBuffer());
    if(new TextDecoder().decode(bytes.subarray(4,8))!=='ftyp')throw Error('invalid_audio');
    await reserveAI(service,user.id,'transcribe');
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    const transcript=await qwen({model:Deno.env.get('QWEN_ASR_MODEL')||'qwen3-asr-flash',messages:[{role:'user',content:[{type:'input_audio',input_audio:{data:'data:audio/mp4;base64,'+btoa(binary)}}]}],asr_options:{language},stream:false});
    if(!transcript.trim()||transcript.length>30000)throw Error('invalid_model_response');
    return json({transcript});
  }catch(error){return aiError(error);}
});
