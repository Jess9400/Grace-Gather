import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("private message unread markers are owned, monotonic and respect blocking", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema private;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
      create function private.can_participate() returns boolean language sql stable as $$select auth.uid() is not null$$;
      create table private.friend_links(id uuid primary key,sender uuid,recipient uuid,status text);
      create table private.friend_directory(user_id uuid primary key,name text);
      create table private.friend_messages(id uuid primary key,link_id uuid,sender uuid,created_at timestamptz);
      create table private.friend_blocks(actor uuid,target uuid);
      create table private.suspensions(user_id uuid);
      grant usage on schema private to authenticated;`);
    await db.exec(await readFile(new URL("../supabase/migrations/20261110145201_friend_unread_receipts.sql", import.meta.url), "utf8"));
    const a = "11111111-1111-4111-8111-111111111111", b = "22222222-2222-4222-8222-222222222222", c = "33333333-3333-4333-8333-333333333333", link = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", first = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", second = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
    await db.query("insert into auth.users values($1),($2),($3)", [a,b,c]);
    await db.query("insert into private.friend_directory values($1,'Alice'),($2,'Bob')", [a,b]);
    await db.query("insert into private.friend_links values($1,$2,$3,'accepted')", [link,a,b]);
    await db.query("insert into private.friend_messages values($1,$2,$3,'2026-01-01'),($4,$2,$3,'2026-01-02')", [first,link,b,second]);
    const asUser = async (user, sql, params = []) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
      await db.exec("set role authenticated");
      try { return await db.query(sql,params); } finally { await db.exec("reset role"); }
    };
    assert.equal((await asUser(a,"select public.friend_unread() as n")).rows[0].n,2);
    const list = (await asUser(a,"select * from public.friend_unread_list()")).rows;
    assert.equal(list.length,1);
    assert.equal(list[0].name,"Bob");
    assert.equal(Number(list[0].unread),2);
    await assert.rejects(asUser(c,"select public.friend_mark_read($1,$2)",[link,second]),/unavailable/);
    await asUser(a,"select public.friend_mark_read($1,$2)",[link,first]);
    assert.equal((await asUser(a,"select public.friend_unread() as n")).rows[0].n,1);
    await asUser(a,"select public.friend_mark_read($1,$2)",[link,second]);
    await asUser(a,"select public.friend_mark_read($1,$2)",[link,first]);
    assert.equal((await asUser(a,"select public.friend_unread() as n")).rows[0].n,0);
    assert.equal((await asUser(a,"select * from public.friend_unread_list()")).rows.length,0);
    assert.equal((await asUser(b,"select public.friend_unread() as n")).rows[0].n,0);
    await db.query("delete from private.friend_reads where user_id=$1",[a]);
    await db.query("insert into private.friend_blocks values($1,$2)",[b,a]);
    assert.equal((await asUser(a,"select public.friend_unread() as n")).rows[0].n,0);
    await assert.rejects(asUser(a,"select public.friend_mark_read($1,$2)",[link,second]),/unavailable/);
    await assert.rejects(asUser(a,"select * from private.friend_reads"),/permission denied/);
  } finally { await db.close(); }
});
