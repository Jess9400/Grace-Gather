-- Follow-ups to the Pro membership migrations, agreed with the owner on 26 Nov 2026:
-- 1. Leaving a shared plan (status 'revoked') stays possible after Pro ends,
--    so a former member can always stop sharing their notes.
-- 2. Daily allowances reset at the member's local midnight (monthly ones on
--    the first of their local month), using the time zone their device reports.
-- 3. The hourly cache cleanup keeps every row that may still be "today"
--    somewhere, so it never hands back an allowance early.

create or replace function private.gate_pro_study_write() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='study_plan_invites' and to_jsonb(new)->>'status' in ('revoked','left','declined','cancelled') then return new; end if;
 perform private.require_pro(); return new; end;$$;
revoke all on function private.gate_pro_study_write() from public,anon,authenticated;

-- The member's time zone. A change takes effect at most once every 20 hours,
-- so moving the clock cannot open extra allowances.
create table if not exists private.member_time_zones(
 user_id uuid primary key references auth.users(id) on delete cascade,
 time_zone text not null check(length(time_zone) between 1 and 64),
 changed_at timestamptz not null default clock_timestamp()
);
alter table private.member_time_zones enable row level security;
revoke all on private.member_time_zones from public,anon,authenticated;

create or replace function private.member_time_zone(p_user uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce((select time_zone from private.member_time_zones where user_id=p_user),'UTC');
$$;
create or replace function private.member_today(p_user uuid) returns date language sql stable security definer set search_path='' as $$
 select (clock_timestamp() at time zone private.member_time_zone(p_user))::date;
$$;
revoke all on function private.member_time_zone(uuid),private.member_today(uuid) from public,anon,authenticated;

create or replace function public.set_time_zone(p_time_zone text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'sign_in_required'; end if;
 if p_time_zone is null or length(p_time_zone)>64 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_time_zone) then raise exception 'invalid_time_zone'; end if;
 insert into private.member_time_zones(user_id,time_zone) values(u,p_time_zone)
 on conflict(user_id) do update set time_zone=excluded.time_zone,changed_at=clock_timestamp()
 where private.member_time_zones.time_zone<>excluded.time_zone
   and private.member_time_zones.changed_at<clock_timestamp()-interval '20 hours';
 return jsonb_build_object('timeZone',private.member_time_zone(u));
end;$$;
revoke all on function public.set_time_zone(text) from public,anon;
grant execute on function public.set_time_zone(text) to authenticated;

-- The implementation lives in the private schema behind the invoker wrapper
-- (20261126122628); only its body changes here.
create or replace function private.membership_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); tz text; d date; pro boolean; adm boolean; lim integer;
begin
 if u is null then raise exception 'sign_in_required'; end if;
 tz:=private.member_time_zone(u); d:=private.member_today(u);
 adm:=private.pro_admin(u); pro:=private.has_pro(u); lim:=case when pro then 3 else 1 end;
 return jsonb_build_object('plan',case when pro then 'pro' else 'free' end,'admin',adm,
 'enforced',(select enforced from private.pro_rollout where id),
 'entries',greatest(0,lim-(select count(*) from private.journal_allowance_requests where user_id=u and day=d and kind='entry' and (state='complete' or state='pending' and created_at>now()-interval '10 minutes'))),
 'followups',greatest(0,lim-(select count(*) from private.journal_allowance_requests where user_id=u and day=d and kind='followup' and (state='complete' or state='pending' and created_at>now()-interval '10 minutes'))),
 'resetsAt',((d+1)::timestamp at time zone tz),
 'studyRemaining',greatest(0,60-(select count(*) from private.journal_allowance_requests where user_id=u and day>=date_trunc('month',d)::date and kind='study' and (state='complete' or state='pending' and created_at>now()-interval '10 minutes'))),
 'studyResetsAt',((date_trunc('month',d::timestamp)+interval '1 month') at time zone tz),
 'timeZone',tz,
 'verifiedAt',(select verified_at from private.pro_entitlements where user_id=u),
 'expiresAt',(select expires_at from private.pro_entitlements where user_id=u and active));
end;$$;
revoke all on function private.membership_status() from public,anon;
grant execute on function private.membership_status() to authenticated;

create or replace function public.reserve_journal_allowance(p_user uuid,p_kind text,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.journal_allowance_requests; d date; period_start date; lim integer; pro boolean;
begin
 if p_kind not in ('entry','followup','study') or p_key !~ '^[a-f0-9]{64}$' or p_user is null then raise exception 'invalid_request'; end if;
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'sign_in_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,711));
 d:=private.member_today(p_user);
 -- Replies are cached only for the current allowance day; no journal text is stored here.
 delete from private.journal_allowance_requests where user_id=p_user and ((kind<>'study' and day<d) or (kind='study' and day<date_trunc('month',d)::date));
 period_start:=case when p_kind='study' then date_trunc('month',d)::date else d end;
 select * into r from private.journal_allowance_requests where user_id=p_user and kind=p_kind and request_key=p_key;
 if found and r.state='complete' then return jsonb_build_object('allowed',true,'replay',true,'result',r.result); end if;
 if found and r.state='pending' and r.created_at>now()-interval '10 minutes' then return jsonb_build_object('allowed',false,'error','request_pending'); end if;
 pro:=private.has_pro(p_user); lim:=case when p_kind='study' then 60 when pro then 3 else 1 end;
 if p_kind='study' and (select enforced from private.pro_rollout where id) and not pro then return jsonb_build_object('allowed',false,'error','pro_required'); end if;
 if (select enforced from private.pro_rollout where id) and not private.pro_admin(p_user) and
   (select count(*) from private.journal_allowance_requests where user_id=p_user and day>=period_start and kind=p_kind and (state='complete' or state='pending' and created_at>now()-interval '10 minutes'))>=lim
 then return jsonb_build_object('allowed',false,'error',case when p_kind='entry' then 'journal_entry_limit' when p_kind='study' then 'study_monthly_limit' else 'journal_followup_limit' end); end if;
 insert into private.journal_allowance_requests(user_id,kind,request_key,day,state) values(p_user,p_kind,p_key,d,'pending')
 on conflict(user_id,kind,request_key) do update set day=d,state='pending',created_at=clock_timestamp(),result=null returning * into r;
 return jsonb_build_object('allowed',true,'id',r.id,'replay',false);
end;$$;
revoke all on function public.reserve_journal_allowance(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_journal_allowance(uuid,text,text) to service_role;

-- Local days run up to a day behind UTC, so keep yesterday (UTC) as well.
create or replace function private.cleanup_pro_allowance_cache() returns integer
language plpgsql security definer set search_path='' as $$
declare d date:=(clock_timestamp() at time zone 'UTC')::date-1; removed integer;
begin
 delete from private.journal_allowance_requests
 where (kind in ('entry','followup') and day<d)
    or (kind='study' and day<date_trunc('month',d)::date);
 get diagnostics removed = row_count;
 return removed;
end;$$;
revoke all on function private.cleanup_pro_allowance_cache() from public,anon,authenticated;
