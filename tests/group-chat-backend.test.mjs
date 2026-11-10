import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Runs every migration in an in-memory Postgres and drives group chats only
// through the public command, as the app does.
let db;
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222",
  staff = "33333333-3333-4333-8333-333333333333",
  carol = "44444444-4444-4444-8444-444444444444",
  dan = "55555555-5555-4555-8555-555555555555",
  eve = "66666666-6666-4666-8666-666666666666",
  unconfirmed = "77777777-7777-4777-8777-777777777777";
const named = { [alice]: "Alice", [bob]: "Bob", [carol]: "Carol", [dan]: "Dan", [eve]: "Eve", [staff]: "Staff" };

before(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,phone_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  for (const file of (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  )
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(
      (
        await readFile(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        )
      ).replace(/^select cron\.schedule\([^\n]+;$/gm, ""),
    );
  for (const id of Object.keys(named))
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
      [id, id + "@example.invalid"],
    );
  await db.query("insert into auth.users(id,email) values($1,$2)", [
    unconfirmed,
    "unconfirmed@example.invalid",
  ]);
  await db.query("insert into private.staff values($1,'moderator')", [staff]);
});
beforeEach(async () => {
  await db.exec(
    "delete from private.group_reports;delete from private.group_messages;delete from private.friend_blocks;delete from public.blocks;delete from private.friend_links;delete from private.friend_directory;delete from private.suspensions;update private.group_chats set open=true;",
  );
  for (const [id, name] of Object.entries(named))
    await db.query(
      "insert into private.friend_directory(user_id,name) values($1,$2)",
      [id, name],
    );
});
after(async () => {
  await db?.close();
});

async function command(user, action, data = {}, role = "authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    user ?? "",
  ]);
  await db.exec("set role " + role);
  try {
    const result = await db.query(
      "select public.group_chat_command($1,$2::jsonb) as data",
      [action, JSON.stringify(data)],
    );
    return result.rows[0].data;
  } finally {
    await db.exec("reset role");
  }
}
const room = async () => (await command(alice, "list")).chats[0];
const read = async (user, chat) => command(user, "messages", { chat });

test("there is one open room for everyone, titled in every app language", async () => {
  const data = await command(alice, "list");
  assert.equal(data.chats.length, 1);
  assert.equal(data.chats[0].slug, "everyone");
  for (const language of ["en", "pt", "es", "ru"]) {
    assert.ok(data.chats[0].title[language]);
    assert.ok(data.chats[0].description[language]);
  }
  assert.deepEqual(data.me, { name: "Alice" });
  assert.equal(data.chats[0].latest_at, null);
});

test("anyone signed in can write and everyone else can read it, under public names only", async () => {
  const chat = (await room()).id;
  await command(alice, "send", { chat, body: "  Peace to you all  " });
  const seenByBob = await read(bob, chat);
  assert.equal(seenByBob.length, 1);
  assert.deepEqual(
    { body: seenByBob[0].body, name: seenByBob[0].name, mine: seenByBob[0].mine },
    { body: "Peace to you all", name: "Alice", mine: false },
  );
  // Nothing that identifies the account leaves the server.
  assert.deepEqual(Object.keys(seenByBob[0]).sort(), ["body", "created_at", "id", "mine", "name"]);
  assert.equal((await read(alice, chat))[0].mine, true);
  assert.ok((await room()).latest_at);
});

test("a public name is needed before writing, and choosing one does not make you findable", async () => {
  const chat = (await room()).id;
  await db.query("delete from private.friend_directory where user_id=$1", [carol]);
  assert.equal((await command(carol, "list")).me, null);
  await assert.rejects(command(carol, "send", { chat, body: "Hello" }), /name_required/);
  await command(carol, "name", { name: "Carol R" });
  await command(carol, "send", { chat, body: "Hello" });
  const row = await db.query("select name,discoverable from private.friend_directory where user_id=$1", [carol]);
  assert.deepEqual(row.rows[0], { name: "Carol R", discoverable: false });
  // Someone who chose to be findable stays findable when they rename here.
  await db.query("update private.friend_directory set discoverable=true where user_id=$1", [bob]);
  await command(bob, "name", { name: "Bobby" });
  const kept = await db.query("select name,discoverable from private.friend_directory where user_id=$1", [bob]);
  assert.deepEqual(kept.rows[0], { name: "Bobby", discoverable: true });
  await assert.rejects(command(dan, "name", { name: "x" }));
});

test("guests, unconfirmed and suspended members cannot read or write", async () => {
  const chat = (await room()).id;
  await assert.rejects(command(null, "list", {}, "anon"));
  await assert.rejects(command(unconfirmed, "list"), /sign_in_required/);
  await db.query("insert into private.suspensions(user_id,reason) values($1,'test')", [bob]);
  await assert.rejects(command(bob, "messages", { chat }), /sign_in_required/);
  await assert.rejects(command(bob, "send", { chat, body: "Hi" }), /sign_in_required/);
});

test("a suspended member's earlier messages disappear for everyone else", async () => {
  const chat = (await room()).id;
  await command(bob, "send", { chat, body: "Before suspension" });
  assert.equal((await read(alice, chat)).length, 1);
  await db.query("insert into private.suspensions(user_id,reason) values($1,'test')", [bob]);
  assert.equal((await read(alice, chat)).length, 0);
});

test("blocking from a message hides both people from each other and ends a friendship", async () => {
  const chat = (await room()).id;
  await db.query("insert into private.friend_links(sender,recipient,status) values($1,$2,'accepted')", [alice, bob]);
  await command(alice, "send", { chat, body: "From Alice" });
  await command(bob, "send", { chat, body: "From Bob" });
  const aliceMessage = (await read(bob, chat)).find((m) => !m.mine).id;
  await command(bob, "block", { message: aliceMessage });
  assert.deepEqual((await read(bob, chat)).map((m) => m.body), ["From Bob"]);
  assert.deepEqual((await read(alice, chat)).map((m) => m.body), ["From Alice"]);
  assert.deepEqual((await read(carol, chat)).map((m) => m.body), ["From Alice", "From Bob"]);
  const link = await db.query("select status from private.friend_links");
  assert.equal(link.rows[0].status, "declined");
  // Blocks made elsewhere in the community are respected too.
  await db.query("insert into public.blocks(user_id,blocked_user_id) values($1,$2)", [carol, alice]);
  assert.deepEqual((await read(carol, chat)).map((m) => m.body), ["From Bob"]);
});

test("reports: not your own, three hide a message until staff decide, staff can keep or remove", async () => {
  const chat = (await room()).id;
  await command(alice, "send", { chat, body: "Reported words" });
  const id = (await read(bob, chat))[0].id;
  await assert.rejects(command(alice, "report", { message: id, reason: "my own" }), /forbidden/);
  await assert.rejects(command(bob, "report", { message: id, reason: "x" }));
  await command(bob, "report", { message: id, reason: "Unkind" });
  await command(bob, "report", { message: id, reason: "Unkind again" });
  await command(carol, "report", { message: id, reason: "Unkind" });
  assert.equal((await read(dan, chat)).length, 1, "two reports do not hide it");
  await command(dan, "report", { message: id, reason: "Unkind" });
  assert.equal((await read(eve, chat)).length, 0, "three open reports hide it");
  assert.equal((await read(alice, chat)).length, 1, "the author still sees it");

  await assert.rejects(command(bob, "reports"), /forbidden/);
  await assert.rejects(command(bob, "resolve_report", { id }), /forbidden/);
  const open = await command(staff, "reports");
  assert.equal(open.length, 3);
  assert.deepEqual({ body: open[0].body, name: open[0].name }, { body: "Reported words", name: "Alice" });

  // Keeping it settles every report and shows the message again.
  await command(staff, "resolve_report", { id: open[0].id });
  assert.equal((await command(staff, "reports")).length, 0);
  assert.equal((await read(eve, chat)).length, 1);

  // Removing it hides it from everyone, the author included.
  await command(eve, "report", { message: id, reason: "Still unkind" });
  const again = await command(staff, "reports");
  await command(staff, "resolve_report", { id: again[0].id, remove: true });
  assert.equal((await read(eve, chat)).length, 0);
  assert.equal((await read(alice, chat)).length, 0);
  await assert.rejects(command(bob, "report", { message: id, reason: "Gone already" }), /forbidden/);
});

test("writing is rate limited and bounded in length", async () => {
  const chat = (await room()).id;
  for (let i = 0; i < 5; i++) await command(alice, "send", { chat, body: "Message " + i });
  await assert.rejects(command(alice, "send", { chat, body: "One too many" }), /rate_limited/);
  await command(bob, "send", { chat, body: "Others are unaffected" });
  await assert.rejects(command(bob, "send", { chat, body: "   " }));
  await assert.rejects(command(bob, "send", { chat, body: "x".repeat(1001) }));
  await assert.rejects(command(bob, "send", { chat, body: "x".repeat(7000) }), /invalid_input/);
});

test("older messages page back in order, 50 at a time", async () => {
  const chat = (await room()).id;
  await db.query(
    "insert into private.group_messages(chat_id,sender,body,created_at) select $1,$2,'m'||g,now()-make_interval(mins=>200-g) from generate_series(1,60) g",
    [chat, alice],
  );
  const latest = await read(bob, chat);
  assert.equal(latest.length, 50);
  assert.equal(latest[0].body, "m11");
  assert.equal(latest.at(-1).body, "m60");
  const older = await command(bob, "messages", { chat, before: latest[0].created_at, beforeId: latest[0].id });
  assert.deepEqual(older.map((m) => m.body), Array.from({ length: 10 }, (_, i) => "m" + (i + 1)));
});

test("a closed room and unknown actions are refused, and the tables are not reachable directly", async () => {
  const chat = (await room()).id;
  await assert.rejects(command(alice, "nonsense", { chat }), /invalid_action/);
  await db.exec("update private.group_chats set open=false");
  assert.equal((await command(alice, "list")).chats.length, 0);
  await assert.rejects(command(alice, "messages", { chat }), /unavailable/);
  await assert.rejects(command(alice, "send", { chat, body: "Hi" }), /unavailable/);
  const grants = await db.query(
    "select has_table_privilege('authenticated','private.group_messages','SELECT') as messages,has_table_privilege('authenticated','private.group_reports','SELECT') as reports,has_function_privilege('anon','public.group_chat_command(text,jsonb)','EXECUTE') as anon",
  );
  assert.deepEqual(grants.rows[0], { messages: false, reports: false, anon: false });
});
