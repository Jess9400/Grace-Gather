import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('journal allowance is separate per account and request type and refunds failed requests', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema private; create schema auth; create table auth.users (id uuid primary key);
      create table private.ai_usage(key text primary key, requests integer not null, expires_at timestamptz not null);
      insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261110130140_journal_daily_allowance.sql', import.meta.url), 'utf8'));
    await db.exec('set role service_role');
    const reserve = async (user, kind, id) => (await db.query('select public.reserve_journal_ai_request($1,$2,$3) as ok', [user, kind, id])).rows[0].ok;
    const finish = (user, id, success) => db.query('select public.finish_journal_ai_request($1,$2,$3)', [user,id,success]);
    const a='00000000-0000-0000-0000-000000000001', b='00000000-0000-0000-0000-000000000002';
    const id = n => `10000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
    assert.equal(await reserve(a,'reflection',id(1)),true);
    assert.equal(await reserve(a,'reflection',id(2)),false);
    assert.equal(await reserve(b,'reflection',id(3)),true);
    assert.equal(await reserve(a,'followup',id(4)),true);
    assert.equal(await reserve(a,'followup',id(5)),true);
    assert.equal(await reserve(a,'followup',id(6)),false);
    await finish(a,id(4),false);
    assert.equal(await reserve(a,'followup',id(6)),true);
    await finish(a,id(1),true);
    await finish(a,id(1),false);
    assert.equal(await reserve(a,'reflection',id(7)),false);
    await db.exec(`update private.journal_ai_reservations set usage_day = usage_day - 1 where user_id = '${a}' and kind = 'reflection'`);
    assert.equal(await reserve(a,'reflection',id(8)),true);
    assert.equal((await db.query(`select has_function_privilege('authenticated','public.reserve_journal_ai_request(uuid,text,uuid)','execute') as allowed`)).rows[0].allowed,false);
    assert.equal((await db.query(`select has_function_privilege('service_role','public.reserve_journal_ai_request(uuid,text,uuid)','execute') as allowed`)).rows[0].allowed,true);
    await db.exec(`reset role; insert into private.ai_usage values ('global:member:'||to_char(clock_timestamp() at time zone 'UTC','YYYYMMDD'),500,now()+interval '1 day'); set role service_role`);
    assert.equal((await db.query('select public.reserve_ai_request($1,$2) as ok',[a,'journey'])).rows[0].ok,false);
    assert.equal((await db.query('select public.reserve_ai_request($1,$2) as ok',[a,'community_moderation'])).rows[0].ok,true);
  } finally { await db.close(); }
});
