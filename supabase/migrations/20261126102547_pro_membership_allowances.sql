-- Store-verified Pro access. Client profiles and editable JWT metadata never grant access.
create table private.pro_rollout(id boolean primary key default true check(id), enforced boolean not null default false);
insert into private.pro_rollout(id) values(true);
create table private.pro_entitlements(
 user_id uuid primary key references auth.users(id) on delete cascade,
 expires_at timestamptz, verified_at timestamptz not null, source_time timestamptz not null,
 environment text not null check(environment in ('production','sandbox')), active boolean not null default false
);
create table private.journal_allowance_requests(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('entry','followup','study')), request_key text not null check(length(request_key)=64),
 day date not null, state text not null check(state in ('pending','complete','failed')),
 created_at timestamptz not null default clock_timestamp(), result jsonb,
 unique(user_id,kind,request_key)
);
create index journal_allowance_day on private.journal_allowance_requests(user_id,day,kind) where state in ('pending','complete');
alter table private.pro_rollout enable row level security;
alter table private.pro_entitlements enable row level security;
alter table private.journal_allowance_requests enable row level security;
revoke all on private.pro_rollout,private.pro_entitlements,private.journal_allowance_requests from public,anon,authenticated;

create function private.pro_admin(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.staff where user_id=p_user and role='admin');
$$;
create function private.has_pro(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.pro_admin(p_user) or exists(select 1 from private.pro_entitlements where user_id=p_user and active and expires_at>now());
$$;
create function private.require_pro() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'sign_in_required'; end if;
 if (select enforced from private.pro_rollout where id) and not private.has_pro(auth.uid()) then raise exception 'pro_required'; end if;
end;$$;
revoke all on function private.pro_admin(uuid),private.has_pro(uuid),private.require_pro() from public,anon,authenticated;

create function public.membership_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d date:=(clock_timestamp() at time zone 'UTC')::date; pro boolean; adm boolean; lim integer;
begin
 if u is null then raise exception 'sign_in_required'; end if;
 adm:=private.pro_admin(u); pro:=private.has_pro(u); lim:=case when pro then 3 else 1 end;
 return jsonb_build_object('plan',case when pro then 'pro' else 'free' end,'admin',adm,
 'enforced',(select enforced from private.pro_rollout where id),
 'entries',greatest(0,lim-(select count(*) from private.journal_allowance_requests where user_id=u and day=d and kind='entry' and (state='complete' or state='pending' and created_at>now()-interval '10 minutes'))),
 'followups',greatest(0,lim-(select count(*) from private.journal_allowance_requests where user_id=u and day=d and kind='followup' and (state='complete' or state='pending' and created_at>now()-interval '10 minutes'))),
 'resetsAt',((d+1)::timestamp at time zone 'UTC'),
 'studyRemaining',greatest(0,60-(select count(*) from private.journal_allowance_requests where user_id=u and day>=date_trunc('month',d)::date and kind='study' and (state='complete' or state='pending' and created_at>now()-interval '10 minutes'))),
 'studyResetsAt',((date_trunc('month',d::timestamp)+interval '1 month') at time zone 'UTC'),
 'verifiedAt',(select verified_at from private.pro_entitlements where user_id=u),
 'expiresAt',(select expires_at from private.pro_entitlements where user_id=u and active));
end;$$;
revoke all on function public.membership_status() from public,anon;
grant execute on function public.membership_status() to authenticated;

-- Only an authenticated server-to-store lookup may write these values. Old snapshots cannot undo newer refunds or renewals.
create function public.sync_pro_entitlement(p_user uuid,p_active boolean,p_expires timestamptz,p_environment text,p_source_time timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=p_user) then return; end if;
 if p_source_time is null or p_source_time>now()+interval '5 minutes' then raise exception 'invalid_snapshot'; end if;
 insert into private.pro_entitlements(user_id,active,expires_at,environment,verified_at,source_time)
 values(p_user,p_active,p_expires,p_environment,clock_timestamp(),p_source_time)
 on conflict(user_id) do update set active=excluded.active,expires_at=excluded.expires_at,environment=excluded.environment,verified_at=excluded.verified_at,source_time=excluded.source_time
 where excluded.source_time>=private.pro_entitlements.source_time;
end;$$;

-- Atomic holds stop two devices spending the same last allowance. Failed provider calls release a hold.
create function public.reserve_journal_allowance(p_user uuid,p_kind text,p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.journal_allowance_requests; d date:=(clock_timestamp() at time zone 'UTC')::date; period_start date; lim integer; pro boolean;
begin
 if p_kind not in ('entry','followup','study') or p_key !~ '^[a-f0-9]{64}$' or p_user is null then raise exception 'invalid_request'; end if;
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'sign_in_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,711));
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
create function public.finish_journal_allowance(p_user uuid,p_id uuid,p_result jsonb default null) returns void language plpgsql security definer set search_path='' as $$
begin
 update private.journal_allowance_requests set state=case when p_result is null then 'failed' else 'complete' end,result=p_result where user_id=p_user and id=p_id and state='pending';
end;$$;
revoke all on function public.sync_pro_entitlement(uuid,boolean,timestamptz,text,timestamptz), public.reserve_journal_allowance(uuid,text,text),public.finish_journal_allowance(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.sync_pro_entitlement(uuid,boolean,timestamptz,text,timestamptz),public.reserve_journal_allowance(uuid,text,text),public.finish_journal_allowance(uuid,uuid,jsonb) to service_role;

-- Protect Pro writes as well as the app controls. Reading/deleting a member's existing notes stays available after expiry.
create function private.gate_pro_study_write() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='study_plan_invites' and to_jsonb(new)->>'status' in ('left','declined','cancelled') then return new; end if;
 perform private.require_pro(); return new; end;$$;
revoke all on function private.gate_pro_study_write() from public,anon,authenticated;
-- Table names are fixed; no user-controlled SQL.
do $$declare t text; begin
 foreach t in array array['study_notes','study_context_notes','study_plan_invites','study_shared_notes','study_note_comments','devotional_history','study_progress'] loop
 if to_regclass('private.'||t) is not null then
 execute format('create trigger pro_write_gate before insert or update on private.%I for each row execute function private.gate_pro_study_write()',t);
 end if;
 end loop;
end;$$;
