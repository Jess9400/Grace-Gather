-- Standalone fixtures for a disposable PostgreSQL database; never run in production.
create role anon;
create role authenticated;
create schema auth;
create schema private;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz,phone_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
create table private.friend_links(id uuid primary key default gen_random_uuid(),sender uuid,recipient uuid,status text);
create table private.friend_directory(user_id uuid primary key,name text);
create table private.friend_blocks(actor uuid,target uuid);
create table private.suspensions(user_id uuid);
create function private.can_participate() returns boolean language sql stable as $$select not exists(select 1 from private.suspensions where user_id=auth.uid());$$;
grant usage on schema auth,private,public to authenticated;
insert into auth.users values('10000000-0000-0000-0000-000000000001',now(),null),('20000000-0000-0000-0000-000000000002',now(),null),('30000000-0000-0000-0000-000000000003',now(),null);
insert into private.friend_directory values('10000000-0000-0000-0000-000000000001','Test reader A'),('20000000-0000-0000-0000-000000000002','Test reader B');
insert into private.friend_links(sender,recipient,status) values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','accepted');
