import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const author='11111111-1111-4111-8111-111111111111', staff='33333333-3333-4333-8333-333333333333', other='44444444-4444-4444-8444-444444444444';
async function setup() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,phone_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid(),auth.jwt() to authenticated,anon;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
    alter table storage.objects enable row level security; grant usage on schema storage to authenticated; grant select,insert,update,delete on storage.objects to authenticated;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for (const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()) {
    const sql=(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8')).replace(/^select cron\.schedule\([^\n]+;$/gm,'');
    await db.exec(sql);
  }
  await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('${author}','author@example.test',now()),('${staff}','staff@example.test',now()),('${other}','other@example.test',now());
    insert into private.staff(user_id,role) values('${staff}','moderator');
    insert into private.ai_community_permission(user_id,allowed,community_version) values('${author}',true,'community-ai-2026-11-14');`);
  return db;
}
async function as(db,user,sql,args=[],role='authenticated') {
  await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]); await db.exec('set role '+role);
  try { return await db.query(sql,args); } finally { await db.exec('reset role'); }
}
test('only active moderators see safety counts and IDs, never private flag records',async()=>{
 const db=await setup(); try {
  await assert.rejects(as(db,author,'select public.moderation_safety_counts()'));
  await assert.rejects(as(db,other,"select public.moderation_safety_ids('stories')"));
  await assert.rejects(as(db,staff,'select * from private.safety_review_flags'));
  assert.equal((await as(db,staff,"select public.moderation_safety_counts() as counts")).rows[0].counts.chats,0);
  await db.query('insert into private.suspensions(user_id,reason) values($1,$2)',[staff,'test']);
  await assert.rejects(as(db,staff,'select public.moderation_safety_counts()'));
 } finally { await db.close(); }
});
test('consented audio flags are service-only, retain no transcript, and disappear when reviewed',async()=>{
 const db=await setup(); try {
  await db.query(`insert into public.confessions(id,kind,author,body,theme,response_type,language,status,created,audio_type) values('audio-test','confession',$1,'','loneliness','listen','en','pending',123,'audio/mp4')`,[author]);
  await db.query(`insert into private.confession_ai_consent(confession_id,author,audio_allowed,version) values('audio-test',$1,true,'confession-ai-2026-11-16')`,[author]);
  const snapshot={created:123,body:'',language:'en',audioType:'audio/mp4'};
  await assert.rejects(as(db,author,"select public.record_safety_review('confession','audio-test',$1,$2::jsonb)",[author,JSON.stringify(snapshot)]));
  assert.equal((await as(db,'',"select public.record_safety_review('confession','audio-test',$1,$2::jsonb) as ok",[other,JSON.stringify(snapshot)],'service_role')).rows[0].ok,false);
  assert.equal((await as(db,'',"select public.record_safety_review('confession','audio-test',$1,$2::jsonb) as ok",[author,JSON.stringify({...snapshot,created:124})],'service_role')).rows[0].ok,false);
  assert.equal((await as(db,'',"select public.record_safety_review('confession','audio-test',$1,$2::jsonb) as ok",[author,JSON.stringify(snapshot)],'service_role')).rows[0].ok,true);
  const flag=(await db.query("select * from private.safety_review_flags where source_id='audio-test'")).rows[0];
  assert.deepEqual(Object.keys(flag).sort(),['created_at','kind','source_id']);
  assert.equal((await db.query("select status,priority from public.confessions where id='audio-test'")).rows[0].status,'pending');
  assert.equal((await as(db,staff,'select public.moderation_safety_counts() as counts')).rows[0].counts.confessions,1);
  assert.deepEqual((await as(db,staff,"select public.moderation_safety_ids('confessions') as ids")).rows[0].ids,['audio-test']);
  await db.exec("update public.confessions set status='rejected' where id='audio-test'");
  assert.equal((await db.query('select count(*)::int as n from private.safety_review_flags')).rows[0].n,0);
 } finally { await db.close(); }
});
test('reports and safety flags across community sections count without exposing content',async()=>{
 const db=await setup(); try {
  const post='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', prayer='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await db.query("insert into public.community_posts(id,author,alias,title,body,status) values($1,$2,'Member','Topic','Test text','pending')",[post,author]);
  await db.query("insert into private.community_screening(post_id,flags,summary) values($1,array['threat'],'Review')",[post]);
  await db.query("insert into private.prayer_requests(id,user_id,theme,reason,starts_at,scheduled,status,screening_flags) values($1,$2,'Theme','Test',now(),false,'pending',array['self_harm'])",[prayer,author]);
  const counts=(await as(db,staff,'select public.moderation_safety_counts() as counts')).rows[0].counts;
  assert.equal(counts.discussions,1); assert.equal(counts.prayers,1);
  assert.deepEqual((await as(db,staff,"select public.moderation_safety_ids('discussions') as ids")).rows[0].ids,[post]);
  assert.deepEqual((await as(db,staff,"select public.moderation_safety_ids('prayers') as ids")).rows[0].ids,[prayer]);
  assert.ok(!JSON.stringify(counts).includes('Test text'));
 } finally { await db.close(); }
});
test('community text flags require current consent and an unchanged author-owned snapshot',async()=>{
 const db=await setup(); try {
  const id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  await db.query("insert into public.content_items(id,kind,data,published) values('story','feed','{}',true)");
  await db.query("insert into public.comments(id,item_id,user_id,alias,body,status) values($1,'story',$2,'Member','Synthetic text','pending')",[id,author]);
  const snapshot=(await db.query("select public.text_moderation_candidate('comment',$1,$2) as candidate",[id,author])).rows[0].candidate;
  const mark=async value=>(await as(db,'',"select public.record_safety_review('comment',$1,$2,$3::jsonb) as ok",[id,author,JSON.stringify(value)],'service_role')).rows[0].ok;
  assert.equal(await mark({...snapshot,body:'changed'}),false);
  await db.query('update private.ai_community_permission set allowed=false where user_id=$1',[author]);
  assert.equal(await mark(snapshot),false);
  await db.query('update private.ai_community_permission set allowed=true where user_id=$1',[author]);
  assert.equal(await mark(snapshot),true);
  assert.equal((await as(db,staff,'select public.moderation_safety_counts() as counts')).rows[0].counts.stories,1);
  assert.deepEqual((await as(db,staff,"select public.moderation_safety_ids('stories') as ids")).rows[0].ids,[id]);
  await db.query("update public.comments set status='approved' where id=$1",[id]);
  assert.equal((await db.query("select count(*)::int n from private.safety_review_flags where source_id=$1",[id])).rows[0].n,0);
 } finally { await db.close(); }
});
test('a recheck preserves a safety flag only with a valid lease and unchanged content',async()=>{
 const db=await setup(); try {
  const id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  await db.exec("insert into public.content_items(id,kind,data,published) values('story','feed','{}',true)");
  await db.query("insert into public.comments(id,item_id,user_id,alias,body,status) values($1,'story',$2,'Member','Synthetic text','approved')",[id,author]);
  await db.query("update private.moderation_rechecks set due_at=now()-interval '1 minute' where kind='comment' and source_id=$1",[id]);
  const job=(await as(db,'','select public.moderation_recheck_claim() as job',[],'service_role')).rows[0].job;
  const snap=(await as(db,'',"select public.moderation_recheck_candidate('comment',$1) as snapshot",[id],'service_role')).rows[0].snapshot;
  const finish=async(snapshot,lease)=>(await as(db,'','select public.moderation_recheck_finish_priority($1,$2,$3::jsonb,$4,$5) as ok',[job.id,lease,JSON.stringify(snapshot),'hold',true],'service_role')).rows[0].ok;
  await assert.rejects(as(db,author,'select public.moderation_recheck_finish_priority($1,$2,$3::jsonb,$4,$5)',[job.id,job.lease_id,JSON.stringify(snap),'hold',true]));
  assert.equal(await finish(snap,'00000000-0000-4000-8000-000000000001'),false);
  assert.equal(await finish(snap,job.lease_id),true);
  assert.equal((await db.query('select status from public.comments where id=$1',[id])).rows[0].status,'pending');
  assert.equal((await as(db,staff,'select public.moderation_safety_counts() as counts')).rows[0].counts.stories,1);
 } finally { await db.close(); }
});
test('reported private chats notify staff without scanning other messages and stop after resolution',async()=>{
 const db=await setup(); try {
  const link='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', message='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb', report='cccccccc-1111-4111-8111-cccccccccccc';
  await db.query("insert into private.moderator_devices(user_id,token) values($1,'ExpoPushToken[test_device]')",[staff]);
  await db.query("insert into private.friend_links(id,sender,recipient,status) values($1,$2,$3,'accepted')",[link,author,other]);
  await db.query("insert into private.friend_messages(id,link_id,sender,body) values($1,$2,$3,'private message')",[message,link,author]);
  assert.equal((await db.query("select count(*)::int as n from private.moderator_push_queue")).rows[0].n,0);
  await db.query("insert into private.friend_reports(id,message_id,reporter,reason) values($1,$2,$3,'Please review')",[report,message,other]);
  assert.equal((await as(db,staff,'select public.moderation_safety_counts() as counts')).rows[0].counts.chats,1);
  assert.equal((await db.query("select private.moderation_item_pending('friend_report',$1) as ok",[report])).rows[0].ok,true);
  assert.equal((await db.query("select count(*)::int as n from private.moderator_push_queue where category='friend_report' and source_id=$1",[report])).rows[0].n,1);
  await db.query('update private.friend_reports set resolved=true where id=$1',[report]);
  assert.equal((await db.query("select private.moderation_item_pending('friend_report',$1) as ok",[report])).rows[0].ok,false);
 } finally { await db.close(); }
});
test('reported group messages enter the queue; journal writes never trigger moderation',async()=>{
 const db=await setup(); try {
  const message='eeeeeeee-1111-4111-8111-eeeeeeeeeeee', report='ffffffff-1111-4111-8111-ffffffffffff';
  await db.query("insert into private.moderator_devices(user_id,token) values($1,'ExpoPushToken[test_device]')",[staff]);
  await db.query("insert into public.account_journals(user_id,entries) values($1,$2::jsonb)",[author,JSON.stringify([{text:'private test journal'}])]);
  assert.equal((await db.query('select count(*)::int as n from private.moderator_push_queue')).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int as n from private.safety_review_flags')).rows[0].n,0);
  await db.query("insert into private.group_messages(id,chat_id,sender,body) select $1,id,$2,'synthetic group text' from private.group_chats where slug='everyone'",[message,author]);
  await db.query("insert into private.group_reports(id,message_id,reporter,reason) values($1,$2,$3,'Please review')",[report,message,other]);
  assert.equal((await as(db,staff,'select public.moderation_safety_counts() as counts')).rows[0].counts.chats,1);
  assert.equal((await db.query("select private.moderation_item_pending('group_report',$1) as ok",[report])).rows[0].ok,true);
  assert.equal((await db.query("select count(*)::int as n from private.moderator_push_queue where category='group_report' and source_id=$1",[report])).rows[0].n,1);
 } finally { await db.close(); }
});
test('gathering reports require visible sessions, expose no reporter identity and notify staff',async()=>{
 const db=await setup(); try {
  const meeting='aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa', hidden='bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
  await db.query("insert into private.moderator_devices(user_id,token) values($1,'ExpoPushToken[test_device]')",[staff]);
  await db.query("insert into public.gatherings(id,title,description,host_id,host_name,starts_at,ends_at,status,visibility) values($1,'{\"en\":\"Circle\"}','{}',$2,'Host',now(),now()+interval '1 hour','published','public'),($3,'{\"en\":\"Private\"}','{}',$2,'Host',now(),now()+interval '1 hour','published','invite')",[meeting,author,hidden]);
  await assert.rejects(as(db,other,'select public.submit_gathering_safety_report($1,$2,$3)',[hidden,'','test report']));
  await assert.rejects(as(db,other,'select * from private.gathering_safety_reports'));
  const id=(await as(db,other,'select public.submit_gathering_safety_report($1,$2,$3) as id',[meeting,'','synthetic safety concern'])).rows[0].id;
  await assert.rejects(as(db,other,'select public.submit_gathering_safety_report($1,$2,$3)',[meeting,'','repeat']));
  await assert.rejects(as(db,other,'select public.gathering_safety_report_queue()'));
  await assert.rejects(as(db,other,'select public.resolve_gathering_safety_report($1)',[id]));
  const reports=(await as(db,staff,'select public.gathering_safety_report_queue() as reports')).rows[0].reports;
  assert.equal(reports.length,1); assert.equal(reports[0].reporter,undefined); assert.equal(reports[0].reason,'synthetic safety concern');
  assert.equal((await as(db,staff,'select public.moderation_safety_counts() as counts')).rows[0].counts.gatherings,1);
  assert.equal((await db.query("select private.moderation_item_pending('gathering_report',$1) as ok",[id])).rows[0].ok,true);
  assert.equal((await db.query("select count(*)::int as n from private.moderator_push_queue where category='gathering_report' and source_id=$1",[id])).rows[0].n,1);
  assert.equal((await as(db,staff,'select public.resolve_gathering_safety_report($1) as ok',[id])).rows[0].ok,true);
  assert.equal((await db.query("select private.moderation_item_pending('gathering_report',$1) as ok",[id])).rows[0].ok,false);
 } finally { await db.close(); }
});
test('priority phone notification contains no submission text and keeps existing queue behavior',async()=>{
 const db=await setup(); try {
  await db.exec(`create schema net; create schema vault;
    create table vault.decrypted_secrets(name text,decrypted_secret text);
    create table net.requests(id bigint generated always as identity,url text,headers jsonb,body jsonb);
    create table net._http_response(id bigint primary key,status_code integer,content text,timed_out boolean,error_msg text);
    create function net.http_post(url text,headers jsonb,body jsonb) returns bigint language sql as $$insert into net.requests(url,headers,body) values(url,headers,body) returning id$$;`);
  await db.query("insert into private.moderator_devices(user_id,token) values($1,'ExpoPushToken[test_device]')",[staff]);
  await db.query("insert into public.confessions(id,kind,author,body,theme,response_type,language,status,created,priority) values('case','confession',$1,'private test content','loneliness','listen','en','pending',123,1)",[author]);
  await db.exec("update private.moderator_push_queue set due_at=now()-interval '1 second'; select private.dispatch_moderator_pushes()");
  const payload=(await db.query('select body from net.requests')).rows[0].body;
  assert.equal(payload.body,'A safety flag or member report needs review.');
  assert.ok(!JSON.stringify(payload).includes('private test content'));
  assert.ok(!JSON.stringify(payload).includes(author));
 } finally { await db.close(); }
});
test('a later AI safety flag sends a new priority alert after a generic notification was already sent',async()=>{
 const db=await setup(); try {
  await db.exec(`create schema net; create schema vault;
    create table vault.decrypted_secrets(name text,decrypted_secret text);
    create table net.requests(id bigint generated always as identity,url text,headers jsonb,body jsonb);
    create table net._http_response(id bigint primary key,status_code integer,content text,timed_out boolean,error_msg text);
    create function net.http_post(url text,headers jsonb,body jsonb) returns bigint language sql as $$insert into net.requests(url,headers,body) values(url,headers,body) returning id$$;`);
  await db.query("insert into private.moderator_devices(user_id,token) values($1,'ExpoPushToken[test_device]')",[staff]);
  await db.query("insert into public.confessions(id,kind,author,body,theme,response_type,language,status,created) values('later','confession',$1,'sample','loneliness','listen','en','pending',123)",[author]);
  await db.query("insert into private.confession_ai_consent(confession_id,author,audio_allowed,version) values('later',$1,false,'confession-ai-2026-11-16')",[author]);
  await db.exec("update private.moderator_push_queue set due_at=now()-interval '1 second'; select private.dispatch_moderator_pushes()");
  const snapshot={created:123,body:'sample',language:'en',audioType:null};
  assert.equal((await as(db,'',"select public.record_safety_review('confession','later',$1,$2::jsonb) as ok",[author,JSON.stringify(snapshot)],'service_role')).rows[0].ok,true);
  await db.exec('select private.dispatch_moderator_pushes()');
  const payloads=(await db.query('select body from net.requests order by id')).rows.map(row=>row.body.body);
  assert.deepEqual(payloads,['A community item needs your review.','A safety flag or member report needs review.']);
 } finally { await db.close(); }
});
test('each new confession report can alert staff without duplicate queued alerts',async()=>{
 const db=await setup(); try {
  await db.query("insert into private.moderator_devices(user_id,token) values($1,'ExpoPushToken[test_device]')",[staff]);
  await db.query("insert into public.confessions(id,kind,author,body,theme,response_type,language,status,created) values('reported','confession',$1,'sample','loneliness','listen','en','approved',123)",[author]);
  await db.query("insert into public.confession_reports(id,target,reporter,reason,created) values('first','reported',$1,'danger',123)",[other]);
  await db.exec("update public.confessions set status='reported' where id='reported'");
  assert.equal((await db.query("select count(*)::int n from private.moderator_push_queue where category='confession' and source_id='reported' and state='pending'")).rows[0].n,1);
  await db.exec("update private.moderator_push_queue set state='sent' where category='confession' and source_id='reported'");
  await db.query("insert into public.confession_reports(id,target,reporter,reason,created) values('second','reported',$1,'other',124)",[staff]);
  assert.equal((await db.query("select count(*)::int n from private.moderator_push_queue where category='confession' and source_id='reported' and state='pending'")).rows[0].n,1);
 } finally { await db.close(); }
});
