import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

let db;
const member = "11111111-1111-4111-8111-111111111111",
  friend = "22222222-2222-4222-8222-222222222222";
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,phone_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1];$$;alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for (const file of (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter((f) => f.endsWith(".sql")).sort())
    await db.exec((await readFile(new URL("../supabase/migrations/" + file, import.meta.url), "utf8")).replace(/^select cron\.schedule\([^\n]+;$/gm, ""));
  await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'a@example.com',now()),($2,'b@example.com',now())", [member, friend]);
  await db.exec("update private.pro_rollout set enforced=true");
});
after(async () => {
  await db?.close();
});
async function as(user, sql, args = []) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec("set role authenticated");
  try {
    return (await db.query(sql, args)).rows[0];
  } finally {
    await db.exec("reset role");
  }
}
const key = (n) => String(n).repeat(64).slice(0, 64);

test("a former member can still leave a shared plan, but not start new Pro activity", async () => {
  await db.exec("alter table private.study_plan_invites disable trigger pro_write_gate");
  const { rows } = await db.query("insert into private.study_plan_invites(plan,inviter,invitee,status) values(0,$1,$2,'accepted') returning id", [member, friend]);
  await db.exec("alter table private.study_plan_invites enable trigger pro_write_gate");
  const left = await as(member, "select public.study_notebook('leave',$1) r", [JSON.stringify({ invitation: rows[0].id })]);
  assert.deepEqual(left.r, { left: true });
  await assert.rejects(
    as(member, "select public.study_notebook('save',$1) r", [JSON.stringify({ verse: "web:JHN.1.1", reference: "John 1:1", body: "A note" })]),
    /pro_required/,
  );
});

test("daily allowances follow the member's own midnight", async () => {
  // Without a time zone the day is UTC, as before.
  assert.equal((await as(member, "select public.membership_status() r")).r.timeZone, "UTC");
  // The public entry point stays a thin invoker wrapper around the private implementation.
  const wrapper = (await db.query("select prosecdef from pg_proc where oid='public.membership_status()'::regprocedure")).rows[0];
  assert.equal(wrapper.prosecdef, false);
  await assert.rejects(as(member, "select public.set_time_zone('Mars/Olympus') r"), /invalid_time_zone/);
  assert.deepEqual((await as(member, "select public.set_time_zone('America/Sao_Paulo') r")).r, { timeZone: "America/Sao_Paulo" });
  const status = (await as(member, "select public.membership_status() r")).r;
  const localToday = (await db.query("select (now() at time zone 'America/Sao_Paulo')::date d")).rows[0].d;
  const midnight = (await db.query("select (($1::date+1)::timestamp at time zone 'America/Sao_Paulo') t", [localToday])).rows[0].t;
  assert.equal(new Date(status.resetsAt).getTime(), new Date(midnight).getTime(), "resets at local midnight");
  // The allowance row is filed under the local day.
  const hold = (await db.query("select public.reserve_journal_allowance($1,'entry',$2) r", [member, key(1)])).rows[0].r;
  assert.equal(hold.allowed, true);
  const day = (await db.query("select day from private.journal_allowance_requests where id=$1", [hold.id])).rows[0].day;
  assert.equal(new Date(day).toISOString().slice(0, 10), new Date(localToday).toISOString().slice(0, 10));
  assert.equal((await db.query("select public.reserve_journal_allowance($1,'entry',$2) r", [member, key(2)])).rows[0].r.error, "journal_entry_limit");
});

test("changing the time zone again within 20 hours does nothing", async () => {
  assert.equal((await as(member, "select public.set_time_zone('Pacific/Kiritimati') r")).r.timeZone, "America/Sao_Paulo");
  await db.query("update private.member_time_zones set changed_at=now()-interval '21 hours' where user_id=$1", [member]);
  assert.equal((await as(member, "select public.set_time_zone('Europe/Lisbon') r")).r.timeZone, "Europe/Lisbon");
});

test("hourly cleanup keeps any row that may still be today somewhere", async () => {
  await db.query(
    "insert into private.journal_allowance_requests(user_id,kind,request_key,day,state) values($1,'entry',$2,(now() at time zone 'UTC')::date-1,'complete'),($1,'entry',$3,(now() at time zone 'UTC')::date-3,'complete')",
    [friend, key(3), key(4)],
  );
  await db.query("select private.cleanup_pro_allowance_cache()");
  const kept = (await db.query("select request_key from private.journal_allowance_requests where user_id=$1", [friend])).rows.map((r) => r.request_key);
  assert.deepEqual(kept, [key(3)]);
});
