import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

test('daily publication is service-only, source-bound and idempotent', async () => {
 const db = new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
   create schema private; create schema vault;
   create table vault.secrets(name text, decrypted_secret text);
   create view vault.decrypted_secrets as select * from vault.secrets;
   create function vault.create_secret(secret text, label text) returns uuid language plpgsql as $$begin insert into vault.secrets values(label,secret);return gen_random_uuid();end$$;
   create table public.content_items(id text primary key,kind text,data jsonb,published boolean,sort_at timestamptz);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261110161435_daily_stories.sql',import.meta.url),'utf8'));
  assert.equal((await db.query('select public.story_import_claim() ok')).rows[0].ok,true);
  assert.equal((await db.query('select public.story_import_claim() ok')).rows[0].ok,false);
  const items=[{title:'A fake story',url:'https://evil.example/wp-content/uploads/2024/01/story.pdf'}, {title:'A story about hope',url:'https://christianfaithstories.org/wp-content/uploads/2024/01/hope.pdf'}];
  const first=(await db.query('select public.story_import_daily($1) result',[JSON.stringify(items)])).rows[0].result;
  assert.equal(first.status,'featured');
  assert.equal((await db.query('select public.story_import_daily($1) result',[JSON.stringify(items)])).rows[0].result.status,'already_featured');
  const row=(await db.query('select data from public.content_items')).rows[0].data;
  assert.equal(row.origin,'publisher'); assert.equal(row.url,items[1].url);
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select * from private.featured_story_links'));
  await assert.rejects(db.query('select public.story_import_claim()'));
  await assert.rejects(db.query('select public.story_import_daily($1)',[JSON.stringify(items)]));
 } finally { await db.close(); }
});
