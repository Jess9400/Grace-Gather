import editorial from '../_shared/news-editorial.json' with {type:'json'};
import { serve,json,admin } from '../_shared/http.ts';
import { summarizeNews } from '../_shared/news-summary.ts';
import { parseFeed } from '../_shared/news-feed.js';
serve(async()=>{
 const db=admin();const store=async(action:string,data:Record<string,unknown>={})=>{const r=await db.rpc('news_store',{p_action:action,p_data:data});if(r.error)throw Error('news_storage_unavailable');return r.data;};
 const sources=await store('sources');
 await Promise.all(sources.map(async(source:{id:string;name:string;url:string;license:string;license_url:string})=>{
  const lease=await store('claim',{id:source.id});if(!lease?.id)return;
  try{
   const response=await fetch(source.url,{headers:{Accept:'application/rss+xml','User-Agent':'GraceAndGather/1.0 (+https://www.graceandgather.online)'},signal:AbortSignal.timeout(12000),redirect:'error'});
   if(!response.ok)throw Error('publisher_http_'+response.status);
   const reader=response.body?.getReader();if(!reader)throw Error('empty_feed');const chunks:Uint8Array[]=[];let size=0;
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000){await reader.cancel();throw Error('feed_too_large');}chunks.push(value);}
   const combined=new Uint8Array(size);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.length;}const xml=new TextDecoder().decode(combined);const parsed=parseFeed(xml,source);
   const items=await Promise.all(parsed.map(async(item:{title:string;url:string;body:string;summary:string;fingerprint:string;publishedAt:string;author:string})=>{
    const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(item.url));const id='news-'+Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,'0')).join('');
    const edited=editorial[id as keyof typeof editorial];
    return {id,type:'news',origin:'news',category:source.id==='nasa'?'Science & discovery':'Community',title:{en:item.title},summary:{en:edited?.summary??item.summary},body:{en:edited?.body??item.body},url:item.url,source:source.name,author:item.author,publishedAt:item.publishedAt,eventDate:edited?.eventDate??null,retrievedAt:new Date().toISOString(),summaryKind:edited?'Original summary':'Publisher excerpt',license:source.license,licenseUrl:source.license_url,fingerprint:item.fingerprint,lang:'en',tags:[],resources:[['read',source.name,item.url]]};
   }));
   const unseen=await store('unseen',{items});
   await store('save',{id:source.id,items:await summarizeNews(unseen)});
  }catch(e){const error=e instanceof Error?e.message:'publisher_unavailable';console.warn(JSON.stringify({source:source.id,error:error.slice(0,120)}));await store('failure',{id:source.id,error});}
 }));
 const health=await store('health');const {data,error}=await db.rpc('discover_page',{p_filter:'news',p_limit:15});if(error)return json({error:'news_storage_unavailable'},503);
 return json({items:(data??[]).map((r:{data:unknown})=>r.data),sources:health,stale:health.some((s:{enabled:boolean;error:string})=>s.enabled&&s.error),checkedAt:new Date().toISOString()});
});
