import { admin, json, serve } from '../_shared/http.ts';
import { catalog } from '../_shared/christian-stories.js';

// A public trigger cannot choose content. The service-only database lease keeps
// repeated requests from causing repeated work or publisher requests.
serve(async req => {
  if (req.method !== 'POST') return json({error:'method_not_allowed'}, 405);
  const db = admin();
  const claim=await db.rpc('story_import_claim');
  if(claim.error)return json({error:'import_failed'},503);
  if(!claim.data)return json({status:'not_due'});
  const response = await fetch('https://christianfaithstories.org/library-of-devotional-stories/', {
    headers:{'User-Agent':'GraceAndGather/1.0 (story links)'}, redirect:'error', signal:AbortSignal.timeout(12000),
  });
  if (!response.ok) return json({error:'source_unavailable'}, 503);
  const reader = response.body?.getReader();
  if (!reader) return json({error:'source_unavailable'}, 503);
  const chunks:Uint8Array[]=[]; let size=0;
  while (true) {
    const {value,done}=await reader.read(); if (done) break;
    size+=value.length; if(size>2_000_000){await reader.cancel();return json({error:'source_too_large'},503)}
    chunks.push(value);
  }
  const bytes=new Uint8Array(size); let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  const items=catalog(new TextDecoder().decode(bytes));
  if(!items.length)return json({error:'source_format_changed'},503);
  const pending=await db.rpc('story_import_unseen',{p_items:items});
  if(pending.error)return json({error:'import_failed'},503);
  if(!pending.data?.length)return json({status:'no_unfeatured_stories'});
  const checks=await Promise.all(pending.data.map(async (item:{url:string})=>{
    try {
      const r=await fetch(item.url,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(5000)});
      return r.ok && (r.headers.get('content-type')||'').toLowerCase().includes('application/pdf');
    } catch{return false}
  }));
  const available=pending.data.filter((_:unknown,i:number)=>checks[i]);
  if(!available.length)return json({error:'stories_unavailable'},503);
  const result=await db.rpc('story_import_daily',{p_items:available});
  if(result.error) return json({error:'import_failed'},503);
  return json(result.data);
});
