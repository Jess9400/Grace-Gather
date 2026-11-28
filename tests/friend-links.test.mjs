import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

let db;
const owner = "11111111-1111-4111-8111-111111111111",
  guest = "22222222-2222-4222-8222-222222222222",
  stranger = "33333333-3333-4333-8333-333333333333";
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,phone_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1];$$;alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for (const file of (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter((f) => f.endsWith(".sql")).sort())
    await db.exec((await readFile(new URL("../supabase/migrations/" + file, import.meta.url), "utf8")).replace(/^select cron\.schedule\([^\n]+;$/gm, ""));
  await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'a@example.com',now()),($2,'b@example.com',now()),($3,'c@example.com',now())", [owner, guest, stranger]);
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
const invite = (user, action, data = {}) =>
  as(user, "select public.friend_invite_command($1,$2) r", [action, JSON.stringify(data)]).then((r) => r.r);
const friends = (user, action, data = {}) =>
  as(user, "select public.friends_command($1,$2) r", [action, JSON.stringify(data)]).then((r) => r.r);

test("a friend link makes two people friends without search or being findable", async () => {
  // A public name comes first: the other person sees it.
  await assert.rejects(invite(owner, "link"), /name_required/);
  await friends(owner, "directory", { name: "Tanya", discoverable: false });
  const { token } = await invite(owner, "link");
  assert.match(token, /^[0-9a-f]{32}$/);
  assert.equal((await invite(owner, "link")).token, token, "the same link every time");
  // The opener sees whose link it is.
  assert.deepEqual(await invite(guest, "preview", { token }), { name: "Tanya", self: false, friends: false });
  await assert.rejects(invite(guest, "accept", { token }), /name_required/);
  await friends(guest, "directory", { name: "Jess", discoverable: false });
  assert.deepEqual(await invite(guest, "accept", { token }), { name: "Tanya" });
  // Both now see each other as friends; nobody was findable.
  const mine = await friends(owner, "list");
  assert.equal(mine.links.length, 1);
  assert.equal(mine.links[0].status, "accepted");
  assert.equal(mine.links[0].name, "Jess");
  assert.equal((await friends(guest, "list")).links[0].name, "Tanya");
  assert.equal((await invite(guest, "preview", { token })).friends, true);
  // Opening it again changes nothing; the owner can't add themselves.
  await invite(guest, "accept", { token });
  assert.equal((await friends(owner, "list")).links.length, 1);
  await assert.rejects(invite(owner, "accept", { token }), /invalid_target/);
});

test("a new link replaces the old one, and blocks still win", async () => {
  const { token: old } = await invite(owner, "link");
  const { token } = await invite(owner, "reset");
  assert.notEqual(token, old);
  await assert.rejects(invite(stranger, "preview", { token: old }), /unavailable/);
  await friends(stranger, "directory", { name: "Stranger", discoverable: false });
  await friends(owner, "block", { peer: stranger });
  await assert.rejects(invite(stranger, "preview", { token }), /unavailable/);
  await assert.rejects(invite(stranger, "accept", { token }), /unavailable/);
  await assert.rejects(invite(stranger, "accept", { token: "" }), /unavailable/);
});

test("signed-out visitors cannot use friend links", async () => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub','',false)");
  await db.exec("set role anon");
  await assert.rejects(db.query("select public.friend_invite_command('link','{}')"), /permission denied/);
  await db.exec("reset role");
});
