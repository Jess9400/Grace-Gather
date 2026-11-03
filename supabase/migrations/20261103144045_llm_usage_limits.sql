-- Only counters are retained; journal text, recordings and transcripts are not stored here.
create table private.ai_usage(key text primary key,requests integer not null default 0,expires_at timestamptz not null);
alter table private.ai_usage enable row level security;
create function public.reserve_ai_request(p_user uuid,p_kind text) returns boolean language plpgsql security definer set search_path='' as $$
declare keys text[]; limits int[]:=array[5,30,500]; i int; t timestamptz:=clock_timestamp();
begin
 if p_kind not in ('journey','transcribe') or not exists(select 1 from auth.users where id=p_user) then return false;end if;
 perform pg_advisory_xact_lock(731209441);
 delete from private.ai_usage where expires_at<t;
 keys:=array['minute:'||p_user::text||':'||to_char(t at time zone 'UTC','YYYYMMDDHH24MI'),'day:'||p_user::text||':'||to_char(t at time zone 'UTC','YYYYMMDD'),'global:'||to_char(t at time zone 'UTC','YYYYMMDD')];
 for i in 1..3 loop
  if coalesce((select requests from private.ai_usage where key=keys[i]),0)>=limits[i] then return false;end if;
 end loop;
 for i in 1..3 loop
  insert into private.ai_usage(key,requests,expires_at) values(keys[i],1,t+interval '2 days') on conflict(key) do update set requests=private.ai_usage.requests+1;
 end loop;
 return true;
end;$$;
revoke all on function public.reserve_ai_request(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_ai_request(uuid,text) to service_role;
