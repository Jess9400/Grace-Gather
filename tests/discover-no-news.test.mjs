import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('Discover excludes news across filters without deleting cached content; pagination retains stories',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create schema auth;create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
 create table public.content_items(id text,data jsonb,sort_at timestamptz,published boolean,kind text);
 create table public.saved_items(item_id text,user_id uuid);
 insert into content_items values ('news-a','{"origin":"news","type":"stories"}',now(),true,'feed'),('story-a','{"origin":"editorial","type":"stories"}',now()-interval '1 hour',true,'feed'),('story-b','{"type":"stories"}',now()-interval '2 hour',true,'feed');
 insert into saved_items select id,auth.uid() from content_items;`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261108104215_pause_discover_news.sql',import.meta.url),'utf8'));
 for(const filter of ['all','saved','stories']){
 const {rows}=await db.query('select id from discover_page($1)',[filter]);assert.deepEqual(rows.map(r=>r.id),['story-a','story-b']);
 }
 assert.equal((await db.query("select * from discover_page('news')")).rows.length,0);
 const {rows:first}=await db.query("select * from discover_page('all',null,'',1)");
 assert.equal((await db.query("select id from discover_page('all',$1,$2,1)",[first[0].sort_at,first[0].id])).rows[0].id,'story-b');
 assert.equal((await db.query('select count(*)::int as n from content_items')).rows[0].n,3);
 }finally{await db.close();}
});
