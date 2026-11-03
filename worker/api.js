const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function validateProfile(b){
 const fields={name:60,city:80,region:80,email:254};
 if(Object.entries(fields).some(([key,max])=>typeof b[key]!=='string'||b[key].length>max||/[\u0000-\u001f\u007f]/.test(b[key])))return null;
 const name=b.name.trim(),city=b.city.trim(),region=b.region.trim(),email=b.email.trim().toLowerCase();
 if(!name||!city||!['BR','PT','US','ES','RU','OTHER'].includes(b.country)||!['faith','calm','connection','kindness'].includes(b.intent)||typeof b.notifications!=='boolean')return null;
 if(b.country==='BR'&&!['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].includes(region))return null;
 if(b.notifications?(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)):!!email)return null;
 return {name,city,region,country:b.country,intent:b.intent,email,notifications:b.notifications};
}
export function recentNews(xml,now=Date.now()){
  const clean=s=>String(s??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(Number(n),0x10ffff))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#039;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
  const field=(s,tag)=>clean(s.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,'i'))?.[1]);
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m=>{const s=m[1],published=Date.parse(field(s,'pubDate')),url=field(s,'link');return {title:field(s,'title'),summary:field(s,'description').split(' ').slice(0,14).join(' ')+'…',url,published,tags:[...s.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map(x=>clean(x[1])).slice(0,2)};}).filter(x=>Number.isFinite(x.published)&&x.published<=now&&x.published>=now-86400000&&/^https:\/\/(www\.)?positive\.news\//.test(x.url)&&x.title).slice(0,8);
}
export function createAPI(itemIds){
  const allowed=new Set(itemIds);let newsCache=null;
  return async function api(request,env){
    const url=new URL(request.url),path=url.pathname,user=request.headers.get('oai-authenticated-user-id');
    if(!user)return json({error:'sign_in_required'},401);
    if(!['GET','POST','DELETE'].includes(request.method))return json({error:'method_not_allowed'},405);
    let payload;
    if(request.method!=='GET'){
      if(request.headers.get('origin')!==url.origin)return json({error:'origin_not_allowed'},403);
      if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'json_required'},415);
      if(Number(request.headers.get('content-length'))>4096)return json({error:'too_large'},413);
      const raw=await request.text();if(raw.length>4096)return json({error:'too_large'},413);try{payload=JSON.parse(raw);}catch{return json({error:'invalid'},400);}
      if(!payload||typeof payload!=='object'||Array.isArray(payload))return json({error:'invalid'},400);
    }
    try{
      if(path==='/api/news'&&request.method==='GET'){
        if(newsCache&&Date.now()-newsCache.checkedAt<300000)return json({...newsCache,items:newsCache.items.filter(x=>x.published>=Date.now()-86400000)});
        const r=await fetch('https://www.positive.news/feed/',{signal:AbortSignal.timeout(8000),headers:{Accept:'application/rss+xml, application/xml'}});
        if(!r.ok)throw Error('news_unavailable');const xml=await r.text();if(xml.length>2000000)throw Error('news_too_large');
        const items=await Promise.all(recentNews(xml).map(async n=>({...n,id:'news-'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(n.url)))).slice(0,16).map(x=>x.toString(16).padStart(2,'0')).join('')})));newsCache={items,checkedAt:Date.now(),source:'Positive News'};return json(newsCache);
      }
      if(!env.DB)return json({error:'unavailable'},503);
      const db=env.DB;
      if(path==='/api/profile'){
        if(request.method==='GET'){
          const row=await db.prepare('SELECT name,city,region,country,intent,email,notifications FROM profiles WHERE user=?').bind(user).first();
          return json({profile:row?{...row,notifications:!!row.notifications}:null});
        }
        if(request.method==='DELETE'){await db.prepare('DELETE FROM profiles WHERE user=?').bind(user).run();return json({ok:true});}
        const profile=validateProfile(payload);if(!profile)return json({error:'invalid_profile'},400);
        const {name,city,region,country,intent,email,notifications}=profile;
        await db.prepare('INSERT INTO profiles (user,name,city,region,country,intent,email,notifications,updated) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(user) DO UPDATE SET name=excluded.name,city=excluded.city,region=excluded.region,country=excluded.country,intent=excluded.intent,email=excluded.email,notifications=excluded.notifications,updated=excluded.updated').bind(user,name,city,region,country,intent,email,notifications?1:0,Date.now()).run();
        return json({profile});
      }

      if(path==='/api/social'&&request.method==='GET'){
        const [likes,comments,mine,interest]=await db.batch([
          db.prepare('SELECT item, count(*) AS count FROM likes GROUP BY item'),
          db.prepare('SELECT item, count(*) AS count FROM comments WHERE deleted=0 GROUP BY item'),
          db.prepare('SELECT item FROM likes WHERE user=?').bind(user),
          db.prepare('SELECT series FROM interests WHERE user=?').bind(user)
        ]);
        return json({likes:likes.results,comments:comments.results,liked:mine.results.map(x=>x.item),interested:interest.results.some(x=>x.series==='thursday')});
      }
      if(path==='/api/interest'&&request.method==='POST'){
        const body=payload;if(typeof body.interested!=='boolean')return json({error:'invalid'},400);
        await (body.interested?db.prepare('INSERT OR IGNORE INTO interests (series,user,created) VALUES (?,?,?)').bind('thursday',user,Date.now()):db.prepare('DELETE FROM interests WHERE series=? AND user=?').bind('thursday',user)).run();return json({interested:body.interested});
      }
      const match=path.match(/^\/api\/items\/([a-z0-9-]+)\/(like|comments)(?:\/([a-z0-9-]+))?$/);
      if(!match||(!allowed.has(match[1])&&!/^news-[a-f0-9]{32}$/.test(match[1])))return json({error:'not_found'},404);
      const[,item,kind,id]=match;
      if(kind==='like'&&request.method==='POST'){
        const b=payload;if(typeof b.liked!=='boolean')return json({error:'invalid'},400);
        await (b.liked?db.prepare('INSERT OR IGNORE INTO likes (item,user,created) VALUES (?,?,?)').bind(item,user,Date.now()):db.prepare('DELETE FROM likes WHERE item=? AND user=?').bind(item,user)).run();
        return json({liked:b.liked,count:(await db.prepare('SELECT count(*) AS count FROM likes WHERE item=?').bind(item).first()).count});
      }
      if(kind==='comments'&&request.method==='GET'){
        const rows=await db.prepare('SELECT id,name,body,created,user FROM comments WHERE item=? AND deleted=0 ORDER BY created DESC LIMIT 100').bind(item).all();
        return json({comments:rows.results.map(({user:author,...c})=>({...c,mine:author===user}))});
      }
      if(kind==='comments'&&request.method==='POST'){
        const b=payload,body=typeof b.body==='string'?b.body.trim():'',name=typeof b.name==='string'?b.name.trim():'';
        if(!body||body.length>600||!name||name.length>40)return json({error:'invalid'},400);
        const recent=await db.prepare('SELECT count(*) AS count FROM comments WHERE user=? AND created>?').bind(user,Date.now()-60000).first();if(recent.count>=5)return json({error:'rate_limited'},429);
        const comment={id:crypto.randomUUID(),item,name,body,created:Date.now(),mine:true};await db.prepare('INSERT INTO comments (id,item,user,name,body,created) VALUES (?,?,?,?,?,?)').bind(comment.id,item,user,name,body,comment.created).run();return json({comment},201);
      }
      if(kind==='comments'&&id&&request.method==='DELETE'){await db.prepare('UPDATE comments SET deleted=1 WHERE id=? AND item=? AND user=?').bind(id,item,user).run();return json({ok:true});}
      return json({error:'not_found'},404);
    }catch{return json({error:path==='/api/news'?'news_unavailable':'unavailable'},503);}
  };
}
