-- Run only in a fresh, isolated test database as the database owner.
\set ON_ERROR_STOP on
create schema auth;
create schema private;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.user_id', true), '')::uuid
$$;
create function private.is_staff() returns boolean language sql stable as $$
  select auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
$$;
create table public.community_posts(status text);
create table public.community_reports(resolved boolean);
create table public.confessions(status text);
create table private.testimonies(status text);
create table private.prayer_requests(id uuid, status text);
create table private.prayer_reports(request_id uuid);
create table public.pay_forward_submissions(status text);
create table public.comments(status text);
create table public.reports(status text);
\ir ../migrations/20261113174754_moderation_queue_counts.sql
insert into public.community_posts values ('pending'), ('approved');
insert into public.community_reports values (false), (true);
insert into public.confessions values ('reported'), ('pending'), ('approved');
insert into private.testimonies values ('pending');
insert into private.prayer_requests values ('00000000-0000-0000-0000-000000000010', 'approved'), ('00000000-0000-0000-0000-000000000011', 'pending');
insert into private.prayer_reports values ('00000000-0000-0000-0000-000000000010'), ('00000000-0000-0000-0000-000000000010');
insert into public.pay_forward_submissions values ('pending');
insert into public.comments values ('pending');
insert into public.reports values ('open');
set role authenticated;
select set_config('test.user_id', '00000000-0000-0000-0000-000000000001', false);
do $$ begin
  if public.moderation_queue_counts() <> '{"discussions":2,"confessions":2,"testimonies":1,"prayers":2,"giving":1,"stories":2}'::jsonb then
    raise exception 'Queue counts are incorrect';
  end if;
end $$;
select set_config('test.user_id', '00000000-0000-0000-0000-000000000002', false);
do $$ begin
  begin
    perform public.moderation_queue_counts();
    raise exception 'Non-moderator was allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon', 'public.moderation_queue_counts()', 'execute') then
    raise exception 'Anonymous user was allowed';
  end if;
end $$;
