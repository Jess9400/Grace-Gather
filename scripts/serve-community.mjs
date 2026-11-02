import http from 'node:http';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {sqliteAdapter} from './local-db.mjs';
import {createAPI} from '../worker/api.js';
import {FEED} from '../dist/community-data.js';
await mkdir('.preview',{recursive:true});
const DB=sqliteAdapter('.preview/community.sqlite');DB.exec('CREATE TABLE IF NOT EXISTS local_migrations(name TEXT PRIMARY KEY)');
for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){if(!(await DB.prepare('SELECT name FROM local_migrations WHERE name=?').bind(file).first())){DB.exec(await readFile('drizzle/'+file,'utf8'));await DB.prepare('INSERT INTO local_migrations VALUES (?)').bind(file).run();}}
const api=createAPI(FEED.map(x=>x.id)),root=resolve('dist'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1:4174');if(url.pathname.startsWith('/api/')){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8192){res.writeHead(413).end();return;}chunks.push(chunk);}const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-preview-reader');const request=new Request(url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const r=await api(request,{DB});res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));return;}const path=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!path.startsWith(root+'/')||path.includes('/server/')||path.includes('/.')){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(path));}catch{res.writeHead(404).end('Not found');}}).listen(4174,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4174'));
