import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile} from 'node:fs/promises';
const owner='00000000-0000-0000-0000-000000000001',member='00000000-0000-0000-0000-000000000002',staff='00000000-0000-0000-0000-000000000003',other='00000000-0000-0000-0000-000000000004';
async function setup(){const db=new PGlite();await db.exec(`create role service_role;create role anon;create role authenticated;create schema auth;create schema private;create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now());insert into auth.users(id) values('${owner}'),('${member}'),('${staff}'),('${other}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table private.suspensions(user_id uuid);create function private.can_participate() returns boolean language sql stable as $$select auth.uid() is not null and not exists(select 1 from private.suspensions where user_id=auth.uid())$$;create function private.is_staff() returns boolean language sql stable as $$select auth.uid()='${staff}'::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261108105504_community_prayer_requests.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('../supabase/migrations/20261109090334_prayer_auto_moderation.sql',import.meta.url),'utf8'));return db;}
async function as(db,id){await db.exec(`reset role;set role authenticated;`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);}
async function cmd(db,action,id=null,data={}){return (await db.query('select public.prayer_command($1,$2,$3) as result',[action,id,JSON.stringify(data)])).rows[0].result;}
async function snapshot(db){return (await db.query('select public.prayer_snapshot() as result')).rows[0].result;}
test('private review, anonymous identities, opt-in notices, unique prayer counts and reporting are enforced',async()=>{const db=await setup();try{
 await as(db,member);await cmd(db,'preferences',null,{enabled:true});await as(db,owner);const r=await cmd(db,'create',null,{theme:'Hope',reason:'A difficult week',alias:''});
 assert.equal((await snapshot(db)).mine[0].status,'pending');await as(db,member);assert.equal((await snapshot(db)).requests.length,0);await assert.rejects(cmd(db,'review',r.id,{status:'approved'}));await assert.rejects(db.query('select * from private.prayer_requests'));
 await as(db,staff);await cmd(db,'review',r.id,{status:'approved'});await as(db,member);let state=await snapshot(db);assert.equal(state.notices.length,1);assert.equal(state.requests[0].alias,'');assert.equal(state.requests[0].user_id,undefined);await cmd(db,'pray',r.id);await cmd(db,'pray',r.id);assert.equal((await snapshot(db)).requests[0].count,1);
 await as(db,owner);await assert.rejects(cmd(db,'pray',r.id));assert.equal((await snapshot(db)).mine[0].count,1);
 await as(db,other);assert.equal((await snapshot(db)).notices.length,0);await assert.rejects(cmd(db,'close',r.id));await cmd(db,'report',r.id,{reason:'Please review'});assert.equal((await snapshot(db)).requests.length,0);
 await as(db,member);await cmd(db,'preferences',null,{enabled:false});assert.equal((await db.query('select prayer_unread() as n')).rows[0].n,0);
 await as(db,owner);await cmd(db,'close',r.id);await as(db,member);assert.equal((await snapshot(db)).requests.length,0);assert.equal((await snapshot(db)).notices.length,0);
 }finally{await db.close();}});
test('scheduled prayer blocks early confirmations and sends one reminder only to opted-in members',async()=>{const db=await setup();try{
 await as(db,member);await cmd(db,'preferences',null,{enabled:true});await as(db,owner);await assert.rejects(cmd(db,'create',null,{theme:'x',reason:'y',starts_at:new Date(Date.now()-1000).toISOString()}));const r=await cmd(db,'create',null,{theme:'Together',reason:'For hope',starts_at:new Date(Date.now()+3600000).toISOString()});await as(db,staff);await cmd(db,'review',r.id,{status:'approved'});await as(db,member);await assert.rejects(cmd(db,'pray',r.id));
 await db.exec('reset role');await db.query("update private.prayer_requests set starts_at=now()-interval '1 minute' where id=$1",[r.id]);await db.exec("update private.prayer_preferences set updated_at=now()-interval '2 minutes';select private.queue_prayer_reminders();select private.queue_prayer_reminders();");await as(db,member);assert.equal((await snapshot(db)).notices.filter(n=>n.kind==='time').length,1);await cmd(db,'pray',r.id);assert.equal((await snapshot(db)).requests[0].count,1);
 }finally{await db.close();}});

async function candidate(db,id,actor=owner){return (await db.query('select prayer_auto_candidate($1,$2) as result',[id,actor])).rows[0].result;}
async function decision(db,id,token,publish=true,flags=[]){return (await db.query('select prayer_auto_result($1,$2,$3,$4,$5,$6) as result',[id,owner,token,publish,flags,'Screening result'])).rows[0].result;}
test('automatic prayer approval is service-only, owner-bound, once-only and sends opted-in notices',async()=>{const db=await setup();try{
 await as(db,member);await cmd(db,'preferences',null,{enabled:true});await as(db,owner);const r=await cmd(db,'create',null,{theme:'Family',reason:'Please pray for recovery'});
 await assert.rejects(candidate(db,r.id));await assert.rejects(decision(db,r.id,owner));
 await db.exec('reset role;set role service_role');assert.equal(await candidate(db,r.id,other),null);const c=await candidate(db,r.id);assert.ok(c.token);assert.equal(await candidate(db,r.id),null);
 assert.equal(await decision(db,r.id,other),'unchanged');assert.equal(await decision(db,r.id,c.token),'approved');assert.equal(await decision(db,r.id,c.token),'unchanged');
 await as(db,member);assert.equal((await snapshot(db)).notices.length,1);assert.equal((await snapshot(db)).requests.length,1);
 }finally{await db.close();}});
test('flags hold prayers, missing results stay pending, and a human decision cannot be overwritten',async()=>{const db=await setup();try{
 await as(db,owner);const r=await cmd(db,'create',null,{theme:'Review',reason:'For review'});await db.exec('reset role;set role service_role');const c=await candidate(db,r.id);
 assert.equal(await decision(db,r.id,c.token,true,['needs_context']),'pending');assert.equal(await decision(db,r.id,c.token),'unchanged');
 await as(db,owner);assert.equal((await snapshot(db)).mine[0].status,'pending');const r2=await cmd(db,'create',null,{theme:'Other',reason:'Request'});await db.exec('reset role;set role service_role');const c2=await candidate(db,r2.id);
 await as(db,member);assert.equal((await snapshot(db)).requests.length,0);
 await as(db,staff);await cmd(db,'review',r2.id,{status:'rejected',reason:'Human review'});await db.exec('reset role;set role service_role');assert.equal(await decision(db,r2.id,c2.token),'unchanged');
 }finally{await db.close();}});
test('suspensions and invalid output prevent automatic approval',async()=>{const db=await setup();try{
 await as(db,owner);const r=await cmd(db,'create',null,{theme:'Hope',reason:'For tomorrow'});await db.exec('reset role;set role service_role');const c=await candidate(db,r.id);
 await assert.rejects(decision(db,r.id,c.token,true,['invented_flag']));await assert.rejects(decision(db,r.id,c.token,true,[null]));
 await db.exec(`reset role;insert into private.suspensions values('${owner}');set role service_role`);assert.equal(await decision(db,r.id,c.token),'unchanged');
 }finally{await db.close();}});
