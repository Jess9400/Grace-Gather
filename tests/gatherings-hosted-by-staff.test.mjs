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
    `);
  return db;
}
async function as(db,user,sql,args=[],role='authenticated') {
  await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]); await db.exec('set role '+role);
  try { return await db.query(sql,args); } finally { await db.exec('reset role'); }
}
const create = (title) => `select public.gathering_command('create', '${JSON.stringify({ title, description: 'A quiet hour of prayer together.', topic: 'Prayer', name: 'Host', language: 'en', now: false, localStart: '2027-03-01T19:00', timezone: 'America/Sao_Paulo', visibility: 'public', capacity: 20, minutes: 60, repeat: 'none' })}'::jsonb) as g`;

test('only the team can create gatherings; members are told why', async () => {
  const db = await setup();
  try {
    await assert.rejects(as(db, author, create('Member circle')), /hosts_only/);
    const made = await as(db, staff, create('Team circle'));
    assert.ok(made.rows[0].g.id);
    // Maintenance without a signed-in member is not affected.
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    await db.query(`insert into public.gatherings(title,description,host_id,host_name,starts_at,ends_at,status,visibility) values('{"en":"Seeded"}','{}',$1,'Host',now()+interval '1 day',now()+interval '25 hours','published','public')`, [author]);
    assert.equal((await db.query("select count(*)::int as n from public.gatherings")).rows[0].n, 2);
  } finally { await db.close(); }
});
