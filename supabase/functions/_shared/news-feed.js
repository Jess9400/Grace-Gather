// Feed text is treated as untrusted data, never as HTML or model instructions.
export function plain(value){return String(value??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<(script|style|iframe|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\/?(?:p|div|br|h[1-6]|li)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,h,d)=>{const n=parseInt(h||d,h?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,k)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[k]).replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n\n').trim();}
export function readable(value){
 const paragraphs=plain(value).split(/\n\s*\n/);const start=paragraphs.findIndex(p=>p.split(/\s+/).length>=20);
 if(start<0)return plain(value);
 const end=paragraphs.findIndex((p,i)=>i>start&&/^(Downloads|References & Resources|You may also be interested|Keep Exploring|Share|Details|Related Terms|Image credit:|For more information)/i.test(p.trim()));
 return paragraphs.slice(start,end<0?undefined:end).filter(p=>!/^Credit:|^Image credit:/i.test(p)).join('\n\n').trim();
}
export function canonical(raw,source){try{const u=new URL(plain(raw));if(u.protocol!=='https:'||u.username||u.password)return null;const hosts=source.id==='nasa'?['www.nasa.gov','nasa.gov','science.nasa.gov']:['globalvoices.org'];if(!hosts.includes(u.hostname))return null;u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_|^fbclid$|^gclid$/.test(key))u.searchParams.delete(key);return u.toString();}catch{return null;}}
export function parseFeed(xml,source,now=Date.now()){
 if(xml.length>2_000_000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('invalid_feed');
 if(!/<rss\b/i.test(xml))throw Error('invalid_feed');
 const seen=new Set();const items=[];
 for(const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)){
  const field=(name)=>match[1].match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]??'';
  const title=plain(field('title')),url=canonical(field('link'),source),time=Date.parse(plain(field('pubDate'))),fingerprint=title.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  if(!url||!title||!Number.isFinite(time)||time>now||time<now-120*86400000||seen.has(fingerprint))continue;
  // APOD commonly contains separately copyrighted photographs; avoid it entirely.
  if(source.id==='nasa'&&(/^APOD:|^TB\s|media advisory|invites media|statement|administrator|storm|hurricane|typhoon|cracking|failure|fatal|disaster/i.test(title)||!/(astronaut|spacewalk|launch|mission|discov|celebrat|student|anniversary|telescope|galax|planet|earth|science|sunrise|dawn|returns|years)/i.test(title)))continue;
  let body=readable(field('content:encoded'))||plain(field('description'));
  body=body.replace(/\n(?:Read more|Written by|The post )[\s\S]*$/i,'').slice(0,12000);
  const summary=plain(field('description'));
  if(!body||!summary)continue;
  seen.add(fingerprint);items.push({title,url,publishedAt:new Date(time).toISOString(),body,summary,fingerprint,author:plain(field('dc:creator'))||source.name});
 }
 return items.slice(0,15);
}
export function fresh(items,now=Date.now()){return items.filter(x=>{const date=Date.parse(x.publishedAt);return Number.isFinite(date)&&date<=now&&date>=now-86400000;});}
