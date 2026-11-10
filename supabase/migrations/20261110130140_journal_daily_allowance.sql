-- Counters contain no journal text, model responses or conversation content.
create table private.journal_ai_reservations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('reflection', 'followup')),
  usage_day date not null,
  created_at timestamptz not null default now(),
  completed boolean not null default false
);
create index journal_ai_reservations_lookup on private.journal_ai_reservations (user_id, usage_day, kind);
alter table private.journal_ai_reservations enable row level security;
revoke all on private.journal_ai_reservations from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.journal_ai_reservations to service_role;

-- The edge function authenticates the caller and supplies its user id. The
-- lock makes concurrent requests across devices share the same allowance.
create function public.reserve_journal_ai_request(p_user uuid, p_kind text, p_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  t timestamptz := clock_timestamp();
  utc_day date := (t at time zone 'UTC')::date;
  max_requests integer;
begin
  if p_user is null or p_id is null or p_kind not in ('reflection', 'followup') then return false; end if;
  max_requests := case p_kind when 'reflection' then 1 else 2 end;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 917031));
  delete from private.journal_ai_reservations
    where user_id = p_user and (created_at < t - interval '2 days'
      or (not completed and created_at < t - interval '3 minutes'));
  if (select count(*) from private.journal_ai_reservations
      where user_id = p_user and kind = p_kind and usage_day = utc_day) >= max_requests then
    return false;
  end if;
  insert into private.journal_ai_reservations(id, user_id, kind, usage_day, created_at)
    values(p_id, p_user, p_kind, utc_day, t);
  return true;
end; $$;
revoke all on function public.reserve_journal_ai_request(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.reserve_journal_ai_request(uuid,text,uuid) to service_role;

create function public.finish_journal_ai_request(p_user uuid, p_id uuid, p_success boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_success then
    update private.journal_ai_reservations set completed = true where id = p_id and user_id = p_user;
  else
    delete from private.journal_ai_reservations where id = p_id and user_id = p_user and not completed;
  end if;
end; $$;
revoke all on function public.finish_journal_ai_request(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.finish_journal_ai_request(uuid,uuid,boolean) to service_role;

-- Moderation has its own safety budget: member AI use must not exhaust it.
create or replace function public.reserve_ai_request(p_user uuid, p_kind text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  keys text[]; limits int[] := array[5,30,500]; i int;
  t timestamptz := clock_timestamp(); lane text;
begin
  if p_kind not in ('journey','transcribe','community_screening','community_moderation')
    or not exists(select 1 from auth.users where id=p_user) then return false; end if;
  lane := case when p_kind in ('community_screening','community_moderation') then 'moderation' else 'member' end;
  perform pg_advisory_xact_lock(731209441);
  delete from private.ai_usage where expires_at<t;
  keys := array[
    'minute:'||lane||':'||p_user::text||':'||to_char(t at time zone 'UTC','YYYYMMDDHH24MI'),
    'day:'||lane||':'||p_user::text||':'||to_char(t at time zone 'UTC','YYYYMMDD'),
    'global:'||lane||':'||to_char(t at time zone 'UTC','YYYYMMDD')
  ];
  for i in 1..3 loop
    if coalesce((select requests from private.ai_usage where key=keys[i]),0)>=limits[i] then return false; end if;
  end loop;
  for i in 1..3 loop
    insert into private.ai_usage(key,requests,expires_at) values(keys[i],1,t+interval '2 days')
      on conflict(key) do update set requests=private.ai_usage.requests+1;
  end loop;
  return true;
end; $$;
revoke all on function public.reserve_ai_request(uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_ai_request(uuid,text) to service_role;
