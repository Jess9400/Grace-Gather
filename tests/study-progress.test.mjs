import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

let db;
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  unconfirmed = "33333333-3333-4333-8333-333333333333";
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,phone_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1];$$;alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for (const file of (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter((f) => f.endsWith(".sql")).sort())
    await db.exec((await readFile(new URL("../supabase/migrations/" + file, import.meta.url), "utf8")).replace(/^select cron\.schedule\([^\n]+;$/gm, ""));
  await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'a@example.com',now()),($2,'b@example.com',now()),($3,'c@example.com',null)", [owner, other, unconfirmed]);
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
const progress = (user, action, data = {}) =>
  as(user, "select public.study_progress($1,$2) r", [action, JSON.stringify(data)]).then((r) => r.r);

test("reading progress is saved to the account and read back by its owner only", async () => {
  assert.equal(await progress(owner, "get", { scope: "plans-web" }), null);
  const state = { active: 0, devotionalDay: 2, days: { 0: 3 }, updatedAt: "2026-11-25T10:00:00.000Z" };
  assert.deepEqual(await progress(owner, "save", { scope: "plans-web", state }), { saved: true });
  assert.deepEqual((await progress(owner, "get", { scope: "plans-web" })).state, state);
  // Each edition keeps its own record; another account sees nothing.
  assert.equal(await progress(owner, "get", { scope: "plans-dra" }), null);
  assert.equal(await progress(other, "get", { scope: "plans-web" }), null);
  // Saving again replaces the record.
  await progress(owner, "save", { scope: "plans-web", state: { ...state, days: { 0: 4 } } });
  assert.equal((await progress(owner, "get", { scope: "plans-web" })).state.days["0"], 4);
});

test("progress needs a confirmed account and well-formed input", async () => {
  await assert.rejects(progress(unconfirmed, "get", { scope: "today" }), /sign_in_required/);
  await assert.rejects(progress(owner, "get", { scope: "../x" }), /invalid_input/);
  await assert.rejects(progress(owner, "save", { scope: "today", state: [1] }), /invalid_input/);
  await assert.rejects(progress(owner, "save", { scope: "today", state: { big: "x".repeat(21000) } }), /invalid_input/);
  await assert.rejects(progress(owner, "drop", { scope: "today" }), /invalid_action/);
  // The table itself is not reachable directly.
  await assert.rejects(as(owner, "select * from private.study_progress"), /permission denied/);
});
