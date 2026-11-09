-- Weekly series are explicit occurrences, each with its own reservation/capacity.
alter table public.gatherings add column series_id uuid;
create index gathering_series on public.gatherings(series_id,starts_at) where series_id is not null;
create or replace function private.gathering_command(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();g public.gatherings;tid uuid;z text;local_start timestamp;start_time timestamptz;minutes integer;my_name text;inv text; total integer:=1; sequence_id uuid; first_id uuid; occurrence integer; next_local timestamp; next_start timestamptz;
begin
 if p_action='list' then return (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select listed.id,listed.series_id,listed.title,listed.description,listed.host_id,listed.host_name,listed.starts_at,listed.ends_at,listed.timezone,listed.capacity,listed.status,listed.visibility,listed.topic,listed.language,exists(select 1 from public.memberships m where m.gathering_id=listed.id and m.user_id=uid) as reserved,(listed.host_id=uid) as hosting from public.gatherings listed where private.gathering_visible(listed.id) and (listed.ends_at>now() or listed.host_id=uid) order by listed.starts_at limit 100) x);end if;
 if p_data->>'id' is not null then tid:=(p_data->>'id')::uuid;select * into g from public.gatherings where id=tid;end if;
 if p_action='details' then
  if g.id is null or not (private.gathering_visible(g.id) or (g.status='published' and exists(select 1 from private.gathering_invites i where i.gathering_id=g.id and i.token::text=p_data->>'invite'))) then raise exception 'unavailable';end if;
  return (to_jsonb(g)-'room_name')||jsonb_build_object('hosting',g.host_id=uid,'reserved',exists(select 1 from public.memberships m where m.gathering_id=g.id and m.user_id=uid));
 end if;
 if uid is null then raise exception 'Sign in to take part in a gathering.';end if;
 if p_action='leave' then delete from public.memberships where gathering_id=tid and user_id=uid;return 'true';end if;
 if not private.can_participate() then raise exception 'not_allowed';end if;
 if p_action='reserve' then perform private.reserve_gathering(tid,coalesce(p_data->>'invite',''));return 'true';end if;
 if p_action='invite' then
  if g.host_id is distinct from uid then raise exception 'host_required';end if;
  if g.visibility='public' then return jsonb_build_object('token',null);end if;
  insert into private.gathering_invites(gathering_id) values(g.id) on conflict do nothing;
  select token::text into inv from private.gathering_invites where gathering_id=g.id;
  return jsonb_build_object('token',inv);
 end if;
 if p_action in ('cancel','cancel_series') then
  if g.host_id is distinct from uid then raise exception 'host_required';end if;
  if p_action='cancel_series' and g.series_id is not null then
    update public.gatherings set status='cancelled' where host_id=uid and series_id=g.series_id and starts_at>now() and status='published';
  else
    if g.starts_at<=now() then raise exception 'Only future sessions can be cancelled here.';end if;
    update public.gatherings set status='cancelled' where id=g.id;
  end if;
  return 'true';
 end if;
 if p_action='create' then
  if coalesce(p_data->>'repeat','none') not in ('none','weekly') then raise exception 'Invalid recurrence.';end if;
  if p_data->>'repeat'='weekly' then
    total:=(p_data->>'occurrences')::integer;
    if total is null or total<2 or total>52 or p_data->>'now'='true' then raise exception 'Choose 2–52 scheduled weekly sessions.';end if;
    sequence_id:=gen_random_uuid();
  end if;
  if coalesce(p_data->>'language','') not in ('en','pt','es','ru') or coalesce(p_data->>'visibility','') not in ('public','invite') or coalesce(length(trim(p_data->>'topic')),0) not between 1 and 60 or coalesce((p_data->>'capacity')::integer,0) not between 2 and 100 then raise exception 'Check language, visibility, topic and capacity.';end if;
  if length(trim(coalesce(p_data->>'title','')))<3 or length(p_data->>'title')>120 or length(trim(coalesce(p_data->>'description','')))<10 or length(p_data->>'description')>1000 then raise exception 'Enter a title (3–120 characters) and description (10–1,000 characters).';end if;
  z:=p_data->>'timezone';if not exists(select 1 from pg_timezone_names where name=z) then raise exception 'Choose a valid timezone, such as America/Sao_Paulo.';end if;
  if p_data->>'now'='true' then start_time:=now();else
   if coalesce(p_data->>'localStart','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' then raise exception 'Enter the date and time in the requested format.';end if;
   local_start:=(p_data->>'localStart')::timestamp;start_time:=local_start at time zone z;
   if start_time at time zone z<>local_start then raise exception 'This local time does not exist because the clocks change. Choose another time.';end if;
   if start_time<now() or start_time>now()+interval '1 year' then raise exception 'Choose a future date within one year.';end if;
  end if;
  minutes:=coalesce((p_data->>'minutes')::integer,60);if minutes<15 or minutes>180 then raise exception 'Choose a duration between 15 and 180 minutes.';end if;
  my_name:=trim(p_data->>'name');if coalesce(length(my_name),0) not between 1 and 60 then raise exception 'Enter your host display name.';end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,43));
  if (select count(distinct coalesce(series_id,id)) from public.gatherings where host_id=uid and created_at>now()-interval '1 day')>=5 then raise exception 'Daily gathering limit reached.';end if;
  for occurrence in 0..total-1 loop
    if occurrence=0 then next_start:=start_time;else
      next_local:=local_start+make_interval(days=>7*occurrence);
      next_start:=next_local at time zone z;
      if next_start at time zone z<>next_local then raise exception 'A session falls in a daylight-saving clock change. Choose a different time.';end if;
    end if;
    if next_start>now()+interval '1 year' then raise exception 'All sessions must fall within one year.';end if;
  insert into public.gatherings(series_id,title,description,host_id,host_name,starts_at,ends_at,timezone,capacity,status,visibility,topic,language) values(sequence_id,jsonb_build_object(p_data->>'language',p_data->>'title'),jsonb_build_object(p_data->>'language',p_data->>'description'),uid,my_name,next_start,next_start+make_interval(mins=>minutes),z,(p_data->>'capacity')::integer,'published',p_data->>'visibility',p_data->>'topic',p_data->>'language') returning * into g;
  insert into private.gathering_invites(gathering_id) values(g.id);
  insert into public.memberships(gathering_id,user_id,can_speak) values(g.id,uid,true);
  if first_id is null then first_id:=g.id;end if;
  end loop;
  select * into g from public.gatherings where id=first_id;
  return (to_jsonb(g)-'room_name')||jsonb_build_object('occurrences',total);
 end if;
 raise exception 'invalid_action';
end;$$;

-- App-only reminders. No email or push delivery is enabled by this migration.
create table private.gathering_notices (
 id uuid primary key default gen_random_uuid(),
 gathering_id uuid not null references public.gatherings(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 starts_at timestamptz not null,
 created_at timestamptz not null default now(),
 is_read boolean not null default false,
 unique(gathering_id,user_id,starts_at)
);
alter table private.gathering_notices enable row level security;
revoke all on private.gathering_notices from public,anon,authenticated;
create index gathering_notices_user on private.gathering_notices(user_id,created_at desc);
create function private.queue_gathering_reminders() returns void language sql security definer set search_path='' as $$
 insert into private.gathering_notices(gathering_id,user_id,starts_at)
 select g.id,recipient.user_id,g.starts_at from public.gatherings g
 cross join lateral (
   select g.host_id as user_id
   union select m.user_id from public.memberships m where m.gathering_id=g.id
 ) recipient
 where g.status='published' and g.starts_at>now() and g.starts_at<=now()+interval '24 hours'
 and recipient.user_id is not null
 and not exists(select 1 from private.suspensions s where s.user_id=recipient.user_id)
 and not exists(select 1 from private.gathering_bans b where b.gathering_id=g.id and b.user_id=recipient.user_id)
 on conflict(gathering_id,user_id,starts_at) do nothing;
$$;
revoke all on function private.queue_gathering_reminders() from public,anon,authenticated;
create function private.gathering_notifications(p_read uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null or not private.can_participate() then raise exception 'unauthorized';end if;
 if p_read is not null then update private.gathering_notices set is_read=true where id=p_read and user_id=u;end if;
 select jsonb_build_object('unread',count(*) filter(where not is_read),'items',coalesce(jsonb_agg(to_jsonb(n) order by starts_at),'[]')) into result
 from (
   select n.id,n.is_read,g.id as gathering_id,g.title,g.starts_at,g.host_name
   from private.gathering_notices n join public.gatherings g on g.id=n.gathering_id
   where n.user_id=u and n.starts_at=g.starts_at and g.status='published' and g.ends_at>now()
   and (g.host_id=u or exists(select 1 from public.memberships m where m.gathering_id=g.id and m.user_id=u))
   and not exists(select 1 from private.gathering_bans b where b.gathering_id=g.id and b.user_id=u)
 ) n;
 return result;
end;$$;
revoke all on function private.gathering_notifications(uuid) from public,anon;
grant execute on function private.gathering_notifications(uuid) to authenticated;
create function public.gathering_notifications(p_read uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.gathering_notifications(p_read)$$;
revoke all on function public.gathering_notifications(uuid) from public,anon;
grant execute on function public.gathering_notifications(uuid) to authenticated;
-- Run once per minute; due reminders are idempotent and catch up after downtime.
select cron.schedule('grace-gathering-reminders','* * * * *','select private.queue_gathering_reminders()');
