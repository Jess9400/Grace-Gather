-- Automated Community review is isolated from human roles and other app areas.
alter table private.community_audit drop constraint community_audit_action_check;
alter table private.community_audit add constraint community_audit_action_check check(action in ('submit','approve','reject','report','resolve_keep','resolve_remove','delete','screen','auto_publish','auto_hold','auto_keep'));

create function public.community_auto_candidate(p_post uuid,p_actor uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'title',p.title,'body',p.body,'perspective',p.perspective,
 'context',(select left(body,2000) from public.community_posts where id=p.parent),
 'report',(select reason from public.community_reports where post_id=p.id and reporter=p_actor and not resolved))
 from public.community_posts p where p.id=p_post
 and exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null)
 and not exists(select 1 from private.suspensions where user_id in (p_actor,p.author))
 and ((p.author=p_actor and p.status='pending' and p.reviewed_at is null)
  or (p.status='approved' and exists(select 1 from public.community_reports where post_id=p.id and reporter=p_actor and not resolved)));
$$;
create function public.community_auto_result(p_post uuid,p_actor uuid,p_publish boolean,p_flags text[],p_summary text) returns text language plpgsql security definer set search_path='' as $$
declare target public.community_posts; allowed boolean;
begin
 if p_publish is null or p_flags is null or p_summary is null or char_length(trim(p_summary)) not between 1 and 600
 or not p_flags <@ array['abuse','threat','hate','sexual_exploitation','privacy','spam','self_harm','needs_context','scam','harmful_advice']::text[] then raise exception 'invalid_screening';end if;
 select * into target from public.community_posts where id=p_post for update;
 if target.id is null or public.community_auto_candidate(p_post,p_actor) is null then return 'unchanged';end if;
 allowed:=p_publish and cardinality(p_flags)=0;
 if target.parent is not null and not exists(select 1 from public.community_posts where id=target.parent and status='approved') then allowed:=false;end if;
 if not allowed then
  update public.community_posts set status='pending',reviewed_at=now() where id=p_post;
 elsif target.status='pending' then
  update public.community_posts set status='approved',reviewed_at=now() where id=p_post;
 else
  update public.community_reports set resolved=true,resolved_at=now() where post_id=p_post and reporter=p_actor;
 end if;
 insert into private.community_screening(post_id,flags,summary) values(p_post,p_flags,p_summary) on conflict(post_id) do update set flags=excluded.flags,summary=excluded.summary,created_at=now();
 insert into private.community_audit(actor,post_id,action) values(p_actor,p_post,case when not allowed then 'auto_hold' when target.status='approved' then 'auto_keep' else 'auto_publish' end);
 return case when allowed then 'approved' else 'held' end;
end;$$;
revoke all on function public.community_auto_candidate(uuid,uuid),public.community_auto_result(uuid,uuid,boolean,text[],text) from public,anon,authenticated;
grant execute on function public.community_auto_candidate(uuid,uuid),public.community_auto_result(uuid,uuid,boolean,text[],text) to service_role;

-- The automatic worker shares the existing bounded AI budget.
create or replace function public.reserve_ai_request(p_user uuid,p_kind text) returns boolean language plpgsql security definer set search_path='' as $$
declare keys text[]; limits int[]:=array[5,30,500]; i int; t timestamptz:=clock_timestamp();
begin
 if p_kind not in ('journey','transcribe','community_screening','community_moderation') or not exists(select 1 from auth.users where id=p_user) then return false;end if;
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
