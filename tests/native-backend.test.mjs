import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
let db;
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222",
  staff = "33333333-3333-4333-8333-333333333333",
  event = "44444444-4444-4444-8444-444444444444";
before(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  await db.exec(
    "create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;",
  );
  // PGlite does not ship pg_cron. Model the scheduler API used in migrations.
  await db.exec("create schema cron; create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;");
  // Match Supabase's permissive hosted defaults so grant regressions are caught.
  await db.exec("alter default privileges in schema public grant all on tables to anon,authenticated,service_role;alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;");
  for (const file of (await readdir(new URL('../supabase/migrations/', import.meta.url))).filter(f=>f.endsWith('.sql')).sort())
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
  await db.exec(
    `insert into auth.users(id,email,email_confirmed_at) values('${alice}','a@example.com',now()),('${bob}','b@example.com',now()),('${staff}','staff@example.com',now());insert into private.staff values('${staff}','admin');insert into public.content_items(id,kind,data,published) values('story','feed','{}',true),('hidden','feed','{}',false);insert into public.gatherings(id,title,description,host_id,host_name,starts_at,ends_at,status,capacity) values('${event}','{"en":"Circle"}','{}','${staff}','Host',now()+interval '1 day',now()+interval '25 hours','published',2);`,
  );
});
after(async () => {
  await db?.close();
});
test('AI counters are service-only and isolate moderation from member limits', async()=>{
  await assert.rejects(as(alice,`select public.reserve_ai_request('${alice}','journey')`));
  await assert.rejects(as(alice,'select * from private.ai_usage'));
  const reserve=async(user,kind='journey')=>(await as('',`select public.reserve_ai_request('${user}','${kind}') as allowed`,'service_role')).rows[0].allowed;
  assert.equal(await reserve(event),false);
  for(let i=0;i<5;i++)assert.equal(await reserve(alice,i%2?'journey':'transcribe'),true);
  assert.equal(await reserve(alice),false);
  await db.exec(`delete from private.ai_usage where key like 'minute:%';update private.ai_usage set requests=30 where key like 'day:member:${alice}:%';`);
  assert.equal(await reserve(alice),false);
  assert.equal(await reserve(bob),true);
  await db.exec("update private.ai_usage set requests=500 where key like 'global:%'");
  assert.equal(await reserve(staff),false);
  assert.equal(await reserve(staff,'community_moderation'),true);
  await db.exec('delete from private.ai_usage');
});
async function as(user, sql, role = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("set role " + role);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}
test("private profiles can only be read and written by their owner", async () => {
  await as(
    alice,
    `insert into public.profiles(id,name) values('${alice}','Alice')`,
  );
  assert.equal(
    (await as(bob, `select * from public.profiles where id='${alice}'`)).rows
      .length,
    0,
  );
  await assert.rejects(
    as(bob, `insert into public.profiles(id,name) values('${staff}','Spoof')`),
  );
  assert.equal(
    (await as(alice, "select name from public.profiles")).rows[0].name,
    "Alice",
  );
});
test("private staff lists and Apple tokens are inaccessible to app users", async () => {
  await assert.rejects(as(alice, "select * from private.staff"));
  await assert.rejects(as(alice, `select public.read_apple_token('${bob}')`));
  await assert.rejects(
    as(alice, `select public.store_apple_token('${bob}','fake')`),
  );
  await assert.rejects(as(alice, "select public.claim_delivery_jobs()"));
});
test("comments are pending until staff approves; users cannot impersonate or approve", async () => {
  const result = await as(
    alice,
    "select public.post_comment('story','Alice','A kind thought') as id",
  );
  const id = result.rows[0].id;
  assert.equal((await as(bob, "select * from public.comments")).rows.length, 0);
  await as(
    alice,
    `update public.comments set status='approved' where id='${id}'`,
  );
  assert.equal((await as(bob, "select * from public.comments")).rows.length, 0);
  await assert.rejects(
    as(
      alice,
      `insert into public.comments(item_id,user_id,alias,body) values('story','${bob}','Bob','spoof')`,
    ),
  );
  await as(
    staff,
    `update public.comments set status='approved' where id='${id}'`,
  );
  assert.equal((await as(bob, "select * from public.comments")).rows.length, 1);
  await as(
    bob,
    `insert into public.blocks(user_id,blocked_user_id) values('${bob}','${alice}')`,
  );
  assert.equal((await as(bob, "select * from public.comments")).rows.length, 0);
  await as(bob, `delete from public.blocks where blocked_user_id='${alice}'`);
});
test("moderators cannot rewrite comment text with their app credentials", async () => {
  await assert.rejects(
    as(staff, "update public.comments set body='rewritten'"),
  );
});
test("comment rate limit and unpublished content are enforced server-side", async () => {
  await assert.rejects(
    as(alice, "select public.post_comment('hidden','Alice','Secret')"),
  );
  for (let i = 0; i < 4; i++)
    await as(alice, `select public.post_comment('story','Alice','More ${i}')`);
  await assert.rejects(
    as(alice, "select public.post_comment('story','Alice','Too many')"),
    /rate_limited/,
  );
});
test("likes cannot be forged or attached to hidden material", async () => {
  await assert.rejects(
    as(
      alice,
      `insert into public.likes(item_id,user_id) values('story','${bob}')`,
    ),
  );
  await assert.rejects(
    as(
      alice,
      `insert into public.likes(item_id,user_id) values('hidden','${alice}')`,
    ),
  );
  await as(
    alice,
    `insert into public.likes(item_id,user_id) values('story','${alice}')`,
  );
  assert.equal(
    Number(
      (await as(bob, "select * from public.feed_stats()")).rows.find(
        (r) => r.item_id === "story",
      ).likes,
    ),
    1,
  );
});
test("reservations are idempotent, capacity limited, and cannot grant speaking rights", async () => {
  await as(alice, `select public.rsvp('${event}',true)`);
  await as(alice, `select public.rsvp('${event}',true)`);
  await as(bob, `select public.rsvp('${event}',true)`);
  await assert.rejects(
    as(staff, `select public.rsvp('${event}',true)`),
    /full/,
  );
  await as(
    alice,
    `update public.memberships set can_speak=true where user_id='${alice}'`,
  );
  assert.equal(
    (await as(alice, "select can_speak from public.memberships")).rows[0]
      .can_speak,
    false,
  );
  await assert.rejects(
    as(
      staff,
      `update public.memberships set user_id='${staff}' where user_id='${alice}'`,
    ),
  );
  await as(
    staff,
    `update public.memberships set can_speak=true where user_id='${alice}'`,
  );
  assert.equal(
    (await as(alice, "select can_speak from public.memberships")).rows[0]
      .can_speak,
    true,
  );
});
test("reports are private and only staff can resolve them", async () => {
  await as(
    alice,
    "select public.report_content('story',null,'spam','Needs review')",
  );
  assert.equal((await as(bob, "select * from public.reports")).rows.length, 0);
  assert.equal(
    (await as(staff, "select * from public.reports")).rows.length,
    1,
  );
  await as(alice, "update public.reports set status='reviewed'");
  assert.equal(
    (await as(alice, "select status from public.reports")).rows[0].status,
    "open",
  );
});
test("suspensions stop posting and gathering participation", async () => {
  await assert.rejects(
    as(alice, `select public.moderate_user('${bob}',true,'abuse')`),
    /not_allowed/,
  );
  await as(staff, `select public.moderate_user('${bob}',true,'abuse')`);
  await assert.rejects(
    as(bob, "select public.post_comment('story','B','No')"),
    /not_allowed/,
  );
  assert.equal(
    (await as(bob, "select public.participation_allowed() as allowed")).rows[0]
      .allowed,
    false,
  );
});
test("notification delivery cannot target an unverified or different email", async () => {
  await as(
    alice,
    `update public.profiles set notification_email='someone@example.com',email_consent=true where id='${alice}'`,
  );
  await db.exec(
    `insert into private.delivery_jobs(user_id,channel,kind,subject,body,due_at,unique_key) select '${alice}','email','gathering','Away','Reminder',now(),id::text||':'||starts_at::text||':${alice}:email' from public.gatherings where id='${event}'`,
  );
  const id = (await db.query("select id from private.delivery_jobs")).rows[0]
    .id;
  assert.equal(
    (await db.query(`select public.delivery_target('${id}') as target`)).rows[0]
      .target.email,
    null,
  );
  await as(
    alice,
    `update public.profiles set notification_email='a@example.com' where id='${alice}'`,
  );
  assert.equal(
    (await db.query(`select public.delivery_target('${id}') as target`)).rows[0]
      .target.email,
    "a@example.com",
  );
});

test("encrypted backup storage only accepts the owner’s fixed private object", async () => {
  await as(
    alice,
    `insert into storage.objects(bucket_id,name) values('journal-backups','${alice}/journal.bin')`,
  );
  assert.equal((await as(bob, "select * from storage.objects")).rows.length, 0);
  await assert.rejects(
    as(
      bob,
      `insert into storage.objects(bucket_id,name) values('journal-backups','${alice}/journal.bin')`,
    ),
  );
  await assert.rejects(
    as(
      bob,
      `insert into storage.objects(bucket_id,name) values('journal-backups','${bob}/nested/file.bin')`,
    ),
  );
  await as(
    bob,
    `delete from storage.objects where name='${alice}/journal.bin'`,
  );
  assert.equal(
    (await as(alice, "select * from storage.objects")).rows.length,
    1,
  );
});

 test('confession tables and atomic RPC are inaccessible to clients; server reservations expire',async()=>{
 await assert.rejects(as(alice,"select * from public.confessions"));
 await assert.rejects(as(alice,"select public.confession_store('queue','[]')"));
 const call=async(op,args)=>{await db.exec('set role service_role');try{return (await db.query("select public.confession_store($1,$2::jsonb) result",[op,JSON.stringify(args)])).rows[0].result;}finally{await db.exec('reset role');}};
 const r={id:'test-confession',kind:'confession',parent:null,author:alice,body:'A test reflection',theme:'faith',response_type:'listen',language:'en',status:'approved',priority:2,signals:'[]',closed:0,thanked:0,claimed_by:null,claimed_until:0,audio_type:null,created:Date.now()};
 assert.equal(await call('insert',[r]),true);assert.equal((await call('list',[bob,'en'])).length,1);
 assert.equal(await call('claim',[r.id,bob,0,1]),true);const claimed=await call('get',[r.id]);assert.ok(Math.abs(claimed.claimed_until-Date.now()-21600000)<2000);
 assert.equal(await call('claim',[r.id,staff]),false);
 const response={...r,id:'test-response',kind:'reply',parent:r.id,author:bob,status:'pending'};
 assert.equal(await call('insert',[response]),true);assert.equal(await call('insert',[{...response,id:'test-second'}]),false);
 await call('report',[{id:'test-report',target:r.id,reporter:bob,reason:'privacy'}]);assert.equal((await call('get',[r.id])).status,'reported');
 await call('moderate',[r.id,'approved',staff,'Context reviewed.']);assert.equal((await call('get',[r.id])).status,'approved');
 await call('remove',[r.id]);assert.equal(await call('get',['test-response']),null);
 });
