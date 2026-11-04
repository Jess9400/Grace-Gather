alter table public.gatherings add column visibility text not null default 'public' check(visibility in ('public','invite'));
alter table public.gatherings add column topic text not null default 'Community' check(length(topic) between 1 and 60);
alter table public.gatherings add column language text not null default 'en' check(language in ('en','pt','es','ru'));
alter table public.gatherings add column created_at timestamptz not null default now();
create index gathering_schedule on public.gatherings(starts_at) where status='published';
create index gathering_host on public.gatherings(host_id,created_at desc);
create index memberships_user on public.memberships(user_id,gathering_id);
create table private.gathering_invites(gathering_id uuid primary key references public.gatherings(id) on delete cascade,token uuid not null unique default gen_random_uuid());
alter table private.gathering_invites enable row level security;
revoke all on private.gathering_invites from public,anon,authenticated;
create function private.gathering_visible(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.gatherings g where g.id=p_id and ((g.status='published' and g.visibility='public') or g.host_id=auth.uid() or exists(select 1 from public.memberships m where m.gathering_id=g.id and m.user_id=auth.uid()) or private.is_staff()));$$;
revoke all on function private.gathering_visible(uuid) from public;
grant execute on function private.gathering_visible(uuid) to anon,authenticated;
drop policy public_schedule on public.gatherings;
drop policy published_gatherings on public.gatherings;
create policy visible_schedule on public.gatherings for select to anon,authenticated using(private.gathering_visible(id));
-- Joining and capacity checks take the same row lock, including invite acceptance.
create function private.reserve_gathering(p_id uuid,p_invite text default '') returns void language plpgsql security definer set search_path='' as $$
declare g public.gatherings;begin
 if not private.can_participate() then raise exception 'not_allowed';end if;
 select * into g from public.gatherings where id=p_id for update;
 if g.id is null or g.status<>'published' or g.ends_at<=now() or g.host_id is null then raise exception 'unavailable';end if;
 if exists(select 1 from private.gathering_bans where gathering_id=g.id and user_id=auth.uid()) then raise exception 'not_allowed';end if;
 if exists(select 1 from public.memberships where gathering_id=g.id and user_id=auth.uid()) then return;end if;
 if g.visibility='invite' and g.host_id<>auth.uid() and not exists(select 1 from private.gathering_invites where gathering_id=g.id and token::text=p_invite) then raise exception 'invite_required';end if;
 if (select count(*) from public.memberships where gathering_id=g.id)>=g.capacity then raise exception 'full';end if;
 insert into public.memberships(gathering_id,user_id,can_speak) values(g.id,auth.uid(),g.host_id=auth.uid());
end;$$;
revoke all on function private.reserve_gathering(uuid,text) from public,anon,authenticated;
create or replace function public.rsvp(p_gathering uuid,p_join boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'unauthorized';end if;
 if not p_join then delete from public.memberships where gathering_id=p_gathering and user_id=auth.uid();return;end if;
 perform private.reserve_gathering(p_gathering);
end;$$;
create function private.gathering_command(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();g public.gatherings;tid uuid;z text;local_start timestamp;start_time timestamptz;minutes integer;my_name text;inv text;
begin
 if p_action='list' then return (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select listed.id,listed.title,listed.description,listed.host_id,listed.host_name,listed.starts_at,listed.ends_at,listed.timezone,listed.capacity,listed.status,listed.visibility,listed.topic,listed.language,exists(select 1 from public.memberships m where m.gathering_id=listed.id and m.user_id=uid) as reserved,(listed.host_id=uid) as hosting from public.gatherings listed where private.gathering_visible(listed.id) and (listed.ends_at>now() or listed.host_id=uid) order by listed.starts_at limit 100) x);end if;
 if p_data->>'id' is not null then tid:=(p_data->>'id')::uuid;select * into g from public.gatherings where id=tid;end if;
 if p_action='details' then
  if g.id is null or not (private.gathering_visible(g.id) or (g.status='published' and exists(select 1 from private.gathering_invites i where i.gathering_id=g.id and i.token::text=p_data->>'invite'))) then raise exception 'unavailable';end if;
  return to_jsonb(g)-'room_name';
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
 if p_action='create' then
  if length(trim(coalesce(p_data->>'title','')))<3 or length(p_data->>'title')>120 or length(trim(coalesce(p_data->>'description','')))<10 or length(p_data->>'description')>1000 then raise exception 'Enter a title (3–120 characters) and description (10–1,000 characters).';end if;
  z:=p_data->>'timezone';if not exists(select 1 from pg_timezone_names where name=z) then raise exception 'Choose a valid timezone, such as America/Sao_Paulo.';end if;
  if p_data->>'now'='true' then start_time:=now();else
   if coalesce(p_data->>'localStart','') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$' then raise exception 'Enter the date and time in the requested format.';end if;
   local_start:=(p_data->>'localStart')::timestamp;start_time:=local_start at time zone z;
   if start_time at time zone z<>local_start then raise exception 'This local time does not exist because the clocks change. Choose another time.';end if;
   if start_time<now() or start_time>now()+interval '1 year' then raise exception 'Choose a future date within one year.';end if;
  end if;
  minutes:=coalesce((p_data->>'minutes')::integer,60);if minutes<15 or minutes>180 then raise exception 'Choose a duration between 15 and 180 minutes.';end if;
  my_name:=trim(p_data->>'name');if coalesce(length(my_name),0) not between 1 and 60 then raise exception 'Enter your host display name.';end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,43));
  if (select count(*) from public.gatherings where host_id=uid and created_at>now()-interval '1 day')>=5 then raise exception 'Daily gathering limit reached.';end if;
  insert into public.gatherings(title,description,host_id,host_name,starts_at,ends_at,timezone,capacity,status,visibility,topic,language) values(jsonb_build_object(p_data->>'language',p_data->>'title'),jsonb_build_object(p_data->>'language',p_data->>'description'),uid,my_name,start_time,start_time+make_interval(mins=>minutes),z,(p_data->>'capacity')::integer,'published',p_data->>'visibility',p_data->>'topic',p_data->>'language') returning * into g;
  insert into private.gathering_invites(gathering_id) values(g.id);
  insert into public.memberships(gathering_id,user_id,can_speak) values(g.id,uid,true);
  return to_jsonb(g)-'room_name';
 end if;
 raise exception 'invalid_action';
end;$$;
revoke all on function private.gathering_command(text,jsonb) from public;
grant execute on function private.gathering_command(text,jsonb) to anon,authenticated;
create function public.gathering_command(p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.gathering_command(p_action,p_data)$$;
revoke all on function public.gathering_command(text,jsonb) from public;
grant execute on function public.gathering_command(text,jsonb) to anon,authenticated;
