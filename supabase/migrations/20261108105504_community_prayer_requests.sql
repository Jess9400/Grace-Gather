-- Anonymous identity stays private; all client access is through checked RPCs.
create table private.prayer_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 theme text not null check(char_length(theme) between 1 and 80), reason text not null check(char_length(reason) between 1 and 1200),
 alias text not null default '' check(char_length(alias)<=40), starts_at timestamptz not null, scheduled boolean not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected','closed')),
 review_reason text not null default '', created_at timestamptz not null default now()
);
create index prayer_requests_time on private.prayer_requests(status,starts_at);
create index prayer_requests_owner on private.prayer_requests(user_id,created_at);
create table private.prayer_preferences(user_id uuid primary key references auth.users(id) on delete cascade, enabled boolean not null default false, updated_at timestamptz not null default now());
create table private.prayer_responses(request_id uuid references private.prayer_requests(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(request_id,user_id));
create table private.prayer_notices(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null references private.prayer_requests(id) on delete cascade,kind text not null check(kind in ('invitation','time','prayed')),is_read boolean not null default false,created_at timestamptz not null default now(),unique(user_id,request_id,kind));
create index prayer_notices_owner on private.prayer_notices(user_id,is_read,created_at);
create table private.prayer_reports(request_id uuid references private.prayer_requests(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,reason text not null check(char_length(reason) between 1 and 500),created_at timestamptz not null default now(),primary key(request_id,user_id));
alter table private.prayer_requests enable row level security;
alter table private.prayer_preferences enable row level security;
alter table private.prayer_responses enable row level security;
alter table private.prayer_notices enable row level security;
alter table private.prayer_reports enable row level security;
revoke all on private.prayer_requests,private.prayer_preferences,private.prayer_responses,private.prayer_notices,private.prayer_reports from public,anon,authenticated;

create function private.prayer_card(r private.prayer_requests) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',r.id,'theme',r.theme,'reason',r.reason,'alias',r.alias,'starts_at',r.starts_at,'scheduled',r.scheduled,'status',r.status,'own',r.user_id=auth.uid(),'review_reason',case when r.user_id=auth.uid() or private.is_staff() then r.review_reason else '' end,'count',(select count(*) from private.prayer_responses x where x.request_id=r.id),'prayed',exists(select 1 from private.prayer_responses x where x.request_id=r.id and x.user_id=auth.uid()));
$$;
revoke all on function private.prayer_card(private.prayer_requests) from public,anon,authenticated;

create function private.queue_prayer_reminders() returns void language sql security definer set search_path='' as $$
 insert into private.prayer_notices(user_id,request_id,kind)
 select p.user_id,r.id,'time' from private.prayer_requests r join private.prayer_preferences p on p.enabled and p.updated_at<=r.starts_at and p.user_id<>r.user_id
 where r.status='approved' and r.scheduled and r.starts_at<=now() and r.starts_at>now()-interval '1 hour'
 and not exists(select 1 from private.suspensions s where s.user_id=p.user_id)
 and not exists(select 1 from private.prayer_reports x where x.request_id=r.id and x.user_id=p.user_id)
 and not exists(select 1 from private.prayer_responses x where x.request_id=r.id and x.user_id=p.user_id)
 on conflict(user_id,request_id,kind) do nothing;
$$;
revoke all on function private.queue_prayer_reminders() from public,anon,authenticated;

create function public.prayer_unread() returns integer language plpgsql stable security definer set search_path='' as $$
begin
 if not private.can_participate() then return 0;end if;
 return (select count(*)::integer from private.prayer_notices n join private.prayer_requests r on r.id=n.request_id where n.user_id=auth.uid() and not n.is_read and r.status='approved' and r.starts_at>now()-interval '7 days' and not exists(select 1 from private.prayer_reports x where x.request_id=r.id and x.user_id=auth.uid()));
end;$$;
create function public.prayer_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.can_participate() then raise exception 'Sign in to join prayers.';end if;
 return jsonb_build_object(
 'enabled',coalesce((select enabled from private.prayer_preferences where user_id=auth.uid()),false),
 'moderator',private.is_staff(),
 'requests',(select coalesce(jsonb_agg(private.prayer_card(r)),'[]') from (select * from private.prayer_requests r where status='approved' and starts_at>now()-interval '7 days' and not exists(select 1 from private.prayer_reports x where x.request_id=r.id and x.user_id=auth.uid()) order by starts_at desc limit 50) r),
 'mine',(select coalesce(jsonb_agg(private.prayer_card(r)),'[]') from (select * from private.prayer_requests where user_id=auth.uid() order by created_at desc limit 50) r),
 'notices',(select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'kind',n.kind,'is_read',n.is_read,'created_at',n.created_at,'request',private.prayer_card(r)) order by n.created_at desc),'[]') from (select * from private.prayer_notices where user_id=auth.uid() order by created_at desc limit 50) n join private.prayer_requests r on r.id=n.request_id where r.status='approved' and r.starts_at>now()-interval '7 days' and not exists(select 1 from private.prayer_reports x where x.request_id=r.id and x.user_id=auth.uid())),
 'review',case when private.is_staff() then (select coalesce(jsonb_agg(private.prayer_card(r)||jsonb_build_object('reports',(select coalesce(jsonb_agg(x.reason),'[]') from private.prayer_reports x where x.request_id=r.id))),'[]') from (select * from private.prayer_requests r where status='pending' or (status='approved' and exists(select 1 from private.prayer_reports x where x.request_id=r.id)) order by created_at limit 50) r) else '[]'::jsonb end);
end;$$;
create function public.prayer_command(p_action text,p_id uuid default null,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r private.prayer_requests; at_time timestamptz; inserted integer;
begin
 if not private.can_participate() then raise exception 'Sign in to join prayers.';end if;
 if p_action='preferences' then
  insert into private.prayer_preferences(user_id,enabled) values(u,coalesce((p_data->>'enabled')::boolean,false)) on conflict(user_id) do update set enabled=excluded.enabled,updated_at=now();
  if not coalesce((p_data->>'enabled')::boolean,false) then update private.prayer_notices set is_read=true where user_id=u;end if;
  return 'true';
 elsif p_action='read' then
  update private.prayer_notices set is_read=true where user_id=u and (p_id is null or id=p_id);return 'true';
 elsif p_action='create' then
  perform pg_advisory_xact_lock(hashtextextended(u::text,71));
  if (select count(*) from private.prayer_requests where user_id=u and created_at>now()-interval '24 hours')>=3 then raise exception 'Please wait before sharing another request.';end if;
  at_time:=case when p_data->>'starts_at' is null then now() else (p_data->>'starts_at')::timestamptz end;
  if not isfinite(at_time) or (p_data->>'starts_at' is not null and (at_time<now()+interval '5 minutes' or at_time>now()+interval '30 days')) then raise exception 'Choose a time between 5 minutes and 30 days from now.';end if;
  insert into private.prayer_requests(user_id,theme,reason,alias,starts_at,scheduled) values(u,trim(p_data->>'theme'),trim(p_data->>'reason'),trim(coalesce(p_data->>'alias','')),at_time,p_data->>'starts_at' is not null) returning * into r;
  return private.prayer_card(r);
 end if;
 select * into r from private.prayer_requests where id=p_id for update;
 if r.id is null then raise exception 'Request unavailable.';end if;
 if p_action='close' then
  if r.user_id<>u and not private.is_staff() then raise exception 'Not allowed.';end if;
  update private.prayer_requests set status='closed' where id=r.id;
 elsif p_action='review' then
  if not private.is_staff() then raise exception 'Not allowed.';end if;
  if r.status not in ('pending','approved') then raise exception 'Request unavailable.';end if;
  if p_data->>'status' not in ('approved','rejected') or p_data->>'status' is null then raise exception 'Invalid decision.';end if;
  if p_data->>'status'='rejected' and length(trim(coalesce(p_data->>'reason','')))=0 then raise exception 'Explain the decision privately.';end if;
  update private.prayer_requests set status=p_data->>'status',review_reason=left(trim(coalesce(p_data->>'reason','')),500) where id=r.id;
  if p_data->>'status'='approved' and r.status='pending' then
   insert into private.prayer_notices(user_id,request_id,kind) select p.user_id,r.id,'invitation' from private.prayer_preferences p where p.enabled and p.user_id<>r.user_id and not exists(select 1 from private.suspensions s where s.user_id=p.user_id) on conflict do nothing;
  end if;
 elsif p_action='pray' then
  if r.status<>'approved' or r.user_id=u or r.starts_at>now() or r.starts_at<now()-interval '7 days' or exists(select 1 from private.prayer_reports where request_id=r.id and user_id=u) then raise exception 'Request unavailable or prayer time has not arrived.';end if;
  insert into private.prayer_responses(request_id,user_id) values(r.id,u) on conflict do nothing;
  get diagnostics inserted=row_count;
  if inserted=1 and exists(select 1 from private.prayer_preferences where user_id=r.user_id and enabled) then
   insert into private.prayer_notices(user_id,request_id,kind) values(r.user_id,r.id,'prayed') on conflict(user_id,request_id,kind) do update set is_read=false,created_at=now();
  end if;
 elsif p_action='report' then
  if r.status<>'approved' or r.user_id=u then raise exception 'Request unavailable.';end if;
  insert into private.prayer_reports(request_id,user_id,reason) values(r.id,u,trim(p_data->>'reason')) on conflict(request_id,user_id) do nothing;
 else raise exception 'Unknown action.';
 end if;
 return 'true';
end;$$;
revoke all on function public.prayer_snapshot(),public.prayer_command(text,uuid,jsonb),public.prayer_unread() from public,anon;
grant execute on function public.prayer_snapshot(),public.prayer_command(text,uuid,jsonb),public.prayer_unread() to authenticated;
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('grace-prayer-reminders','* * * * *','select private.queue_prayer_reminders()');
 end if;
end $$;
