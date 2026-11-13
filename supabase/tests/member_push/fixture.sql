\set ON_ERROR_STOP on
\ir ../moderator_push/fixture.sql
alter table private.prayer_requests add column starts_at timestamptz;
alter table public.community_reports add column reporter uuid;
alter table public.community_reports add column post_id uuid;
alter table private.testimonies add column author uuid;
alter table public.comments add column item_id text;
alter table public.comments add column user_id uuid;
alter table public.reports add column reporter_id uuid;
alter table public.reports add column comment_id uuid;
alter table public.reports add column item_id text;
create table public.content_items(id text primary key,published boolean);
create table private.prayer_notices(id uuid primary key,user_id uuid,request_id uuid,kind text,is_read boolean default false,created_at timestamptz default now());
create table private.activity_notices(id uuid primary key,recipient uuid,actor uuid,kind text,target text,source text,is_read boolean default false);
create table private.friend_links(id uuid primary key,sender uuid,recipient uuid,status text);
create table private.friend_messages(id uuid primary key,link_id uuid,sender uuid,body text,created_at timestamptz default now());
create table private.friend_reads(link_id uuid,user_id uuid,seen_at timestamptz,seen_id uuid);
create table private.friend_blocks(actor uuid,target uuid);
create table public.gatherings(id uuid primary key,host_id uuid,status text,starts_at timestamptz,ends_at timestamptz);
create table private.gathering_notices(id uuid primary key,gathering_id uuid,user_id uuid,starts_at timestamptz,is_read boolean default false);
create table private.gathering_bans(gathering_id uuid,user_id uuid);
\ir ../../migrations/20261113140144_member_phone_alerts.sql
