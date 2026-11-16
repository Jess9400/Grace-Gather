import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('a private thank-you is visible only to the comforter, with safe compatibility and push filtering', async () => {
  const db = new PGlite();
  const author = '11111111-1111-4111-8111-111111111111';
  const helper = '22222222-2222-4222-8222-222222222222';
  const other = '33333333-3333-4333-8333-333333333333';
  await db.exec(`
    create role anon; create role authenticated; create schema auth; create schema private;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.confessions(id text primary key, parent text, author uuid, kind text, status text, thanked int default 0);
    create table public.confession_blocks(actor uuid, target uuid);
    create table public.blocks(user_id uuid, blocked_user_id uuid);
    create table private.suspensions(user_id uuid);
    create table private.activity_notices(id uuid default gen_random_uuid() primary key,recipient uuid,actor uuid,kind text not null check(kind in ('confession_reply','discussion_reply')),target text,source text,is_read bool default false,created_at timestamptz default now(),unique(recipient,kind,source));
    create function private.activity_snapshot() returns jsonb language sql stable as $$
      select jsonb_build_object('pendingModeration',0,'unread',count(*) filter(where not is_read),'items',coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'target',target,'is_read',is_read,'created_at',created_at)),'[]'::jsonb)) from private.activity_notices where recipient=auth.uid()
    $$;
    create function private.member_push_still_relevant(uuid,text,uuid) returns boolean language sql stable as $$ select false $$;
    insert into public.confessions(id,author,kind,status) values('parent','${author}','confession','approved');
    insert into public.confessions(id,parent,author,kind,status) values('reply','parent','${helper}','reply','approved');
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261116115712_confession_thanks_notifications.sql', import.meta.url), 'utf8'));
  await db.exec(`update public.confessions set thanked=1 where id='reply'; update public.confessions set thanked=1 where id='reply'; select set_config('request.jwt.claim.sub','${helper}',false);`);
  let result = await db.query(`select public.activity_snapshot_v2() as snapshot`);
  assert.equal(result.rows[0].snapshot.unread, 1);
  assert.equal(result.rows[0].snapshot.items[0].kind, 'confession_thanks');
  assert.equal(Object.hasOwn(result.rows[0].snapshot.items[0], 'actor'), false);
  const id = result.rows[0].snapshot.items[0].id;
  assert.equal((await db.query(`select private.member_push_still_relevant('${helper}','activity','${id}') as relevant`)).rows[0].relevant, true);
  assert.equal((await db.query(`select private.activity_snapshot() as snapshot`)).rows[0].snapshot.unread, 0);
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false);`);
  assert.equal((await db.query(`select public.activity_snapshot_v2() as snapshot`)).rows[0].snapshot.unread, 0);
  await db.exec(`insert into public.confession_blocks values('${helper}','${author}'); select set_config('request.jwt.claim.sub','${helper}',false);`);
  assert.equal((await db.query(`select public.activity_snapshot_v2() as snapshot`)).rows[0].snapshot.unread, 0);
  assert.equal((await db.query(`select private.member_push_still_relevant('${helper}','activity','${id}') as relevant`)).rows[0].relevant, false);
  await db.close();
});
