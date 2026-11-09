-- One server-owned screening attempt per request. Human decisions always win.
alter table private.prayer_requests add column screening_token uuid,
 add column screened_at timestamptz, add column screening_flags text[], add column screening_summary text;
create function public.prayer_auto_candidate(p_post uuid,p_actor uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.prayer_requests;
begin
 update private.prayer_requests set screening_token=gen_random_uuid()
 where id=p_post and user_id=p_actor and status='pending' and screening_token is null
 and exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null)
 and not exists(select 1 from private.suspensions where user_id=p_actor)
 returning * into r;
 if r.id is null then return null;end if;
 return jsonb_build_object('id',r.id,'token',r.screening_token,'theme',r.theme,'reason',r.reason,'alias',r.alias);
end;$$;
create function public.prayer_auto_result(p_post uuid,p_actor uuid,p_token uuid,p_publish boolean,p_flags text[],p_summary text) returns text
language plpgsql security definer set search_path='' as $$
declare r private.prayer_requests; allowed boolean;
begin
 if p_publish is null or p_flags is null or p_summary is null or char_length(trim(p_summary)) not between 1 and 600
 or array_position(p_flags,null) is not null
 or not p_flags <@ array['abuse','threat','hate','sexual_exploitation','privacy','spam','self_harm','needs_context','scam','harmful_advice']::text[] then raise exception 'invalid_screening';end if;
 select * into r from private.prayer_requests where id=p_post for update;
 if r.id is null or r.user_id<>p_actor or r.status<>'pending' or r.screened_at is not null
 or p_token is null or r.screening_token is distinct from p_token
 or not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null)
 or exists(select 1 from private.suspensions where user_id=p_actor)
 then return 'unchanged';end if;
 allowed:=p_publish and cardinality(p_flags)=0 and (not r.scheduled or r.starts_at>now()) and r.starts_at>now()-interval '7 days';
 update private.prayer_requests set status=case when allowed then 'approved' else 'pending' end,
 screened_at=now(),screening_flags=p_flags,screening_summary=p_summary,
 review_reason=case when allowed then '' else 'Your request needs moderator review.' end where id=r.id;
 if allowed then
 insert into private.prayer_notices(user_id,request_id,kind)
 select p.user_id,r.id,'invitation' from private.prayer_preferences p where p.enabled and p.user_id<>r.user_id
 and not exists(select 1 from private.suspensions s where s.user_id=p.user_id)
 on conflict(user_id,request_id,kind) do nothing;
 end if;
 return case when allowed then 'approved' else 'pending' end;
end;$$;
revoke all on function public.prayer_auto_candidate(uuid,uuid),public.prayer_auto_result(uuid,uuid,uuid,boolean,text[],text) from public,anon,authenticated;
grant execute on function public.prayer_auto_candidate(uuid,uuid),public.prayer_auto_result(uuid,uuid,uuid,boolean,text[],text) to service_role;
