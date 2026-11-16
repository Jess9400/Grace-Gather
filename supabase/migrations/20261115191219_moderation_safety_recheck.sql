-- A private queue stores identifiers and scheduling state, never post content.
create table private.moderation_rechecks (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('confession','discussion','prayer','testimony','comment','giving')),
  source_id text not null,
  due_at timestamptz not null default now()+interval '6 hours',
  lease_id uuid, lease_until timestamptz,
  attempts integer not null default 0,
  state text not null default 'pending' check(state in ('pending','done','skipped')),
  unique(kind,source_id)
);
alter table private.moderation_rechecks enable row level security;
revoke all on private.moderation_rechecks from public,anon,authenticated;
create index moderation_rechecks_due on private.moderation_rechecks(due_at) where state='pending';

create function private.enqueue_moderation_recheck() returns trigger language plpgsql security definer set search_path='' as $$
declare v_kind text:=tg_argv[0]; expected text:=case when tg_argv[0]='testimony' then 'published' else 'approved' end;
begin
  if new.status::text<>expected then return new; end if;
  if tg_op='UPDATE' and old.status::text=new.status::text then return new; end if;
  insert into private.moderation_rechecks(kind,source_id) values(v_kind,new.id::text)
    on conflict(kind,source_id) do update set due_at=now()+interval '6 hours',lease_id=null,lease_until=null,attempts=0,state='pending';
  return new;
end $$;
revoke all on function private.enqueue_moderation_recheck() from public,anon,authenticated;
create trigger recheck_confession after insert or update of status on public.confessions for each row execute function private.enqueue_moderation_recheck('confession');
create trigger recheck_discussion after insert or update of status on public.community_posts for each row execute function private.enqueue_moderation_recheck('discussion');
create trigger recheck_prayer after insert or update of status on private.prayer_requests for each row execute function private.enqueue_moderation_recheck('prayer');
create trigger recheck_testimony after insert or update of status on private.testimonies for each row execute function private.enqueue_moderation_recheck('testimony');
create trigger recheck_comment after insert or update of status on public.comments for each row execute function private.enqueue_moderation_recheck('comment');
create trigger recheck_giving after insert or update of status on public.pay_forward_submissions for each row execute function private.enqueue_moderation_recheck('giving');

-- Existing public content is queued too; consent is checked before it is read
-- for AI. Older confessions without specific consent are skipped.
insert into private.moderation_rechecks(kind,source_id,due_at)
  select 'confession',id,to_timestamp(created::double precision/1000)+interval '6 hours' from public.confessions where status='approved'
  union all select 'discussion',id::text,created_at+interval '6 hours' from public.community_posts where status='approved'
  union all select 'prayer',id::text,created_at+interval '6 hours' from private.prayer_requests where status='approved'
  union all select 'testimony',id::text,coalesce(published_at,updated_at)+interval '6 hours' from private.testimonies where status='published'
  union all select 'comment',id::text,created_at+interval '6 hours' from public.comments where status='approved'
  union all select 'giving',id::text,created_at+interval '6 hours' from public.pay_forward_submissions where status='approved'
  on conflict(kind,source_id) do nothing;

create function public.moderation_recheck_claim() returns setof jsonb
language sql security definer set search_path='' as $$
  with due as (select id from private.moderation_rechecks where state='pending' and due_at<=now() and (lease_until is null or lease_until<now()) order by due_at for update skip locked limit 4),
  claimed as (update private.moderation_rechecks q set lease_id=gen_random_uuid(),lease_until=now()+interval '4 minutes',attempts=attempts+1
    from due where q.id=due.id returning q.*)
  select to_jsonb(claimed) from claimed;
$$;
revoke all on function public.moderation_recheck_claim() from public,anon,authenticated;
grant execute on function public.moderation_recheck_claim() to service_role;

create function public.moderation_recheck_candidate(p_kind text,p_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare value jsonb; owner uuid;
begin
  if p_kind='confession' then
    select c.author,jsonb_build_object('kind',p_kind,'id',c.id,'author',c.author,'body',c.body,'language',c.language,'audioType',c.audio_type,'created',c.created)
    into owner,value from public.confessions c join private.confession_ai_consent a on a.confession_id=c.id and a.author=c.author and (c.audio_type is null or a.audio_allowed)
    where c.id=p_id and c.status='approved' and c.closed=0;
  elsif p_kind='discussion' then
    select p.author,jsonb_build_object('kind',p_kind,'id',p.id,'author',p.author,'title',p.title,'body',p.body,'displayName',p.alias,'perspective',p.perspective,'created',p.created_at)
    into owner,value from public.community_posts p where p.id::text=p_id and p.status='approved';
  elsif p_kind='prayer' then
    select r.user_id,jsonb_build_object('kind',p_kind,'id',r.id,'author',r.user_id,'title',r.theme,'body',r.reason,'displayName',r.alias,'created',r.created_at)
    into owner,value from private.prayer_requests r where r.id::text=p_id and r.status='approved';
  elsif p_kind='testimony' then
    select t.author,jsonb_build_object('kind',p_kind,'id',t.id,'author',t.author,'title',t.title,'body',t.body,'displayName',case when t.anonymous then '' else t.display_name end,'language',t.language,'revision',t.revision)
    into owner,value from private.testimonies t where t.id::text=p_id and t.status='published';
  elsif p_kind='comment' then
    select c.user_id,jsonb_build_object('kind',p_kind,'id',c.id,'author',c.user_id,'body',c.body,'displayName',c.alias,'created',c.created_at)
    into owner,value from public.comments c join public.content_items i on i.id=c.item_id and i.published where c.id::text=p_id and c.status='approved';
  elsif p_kind='giving' then
    select g.owner_id,jsonb_build_object('kind',p_kind,'id',g.id,'author',g.owner_id,'title',g.title,'body',g.body,'website',g.website,'created',g.created_at)
    into owner,value from public.pay_forward_submissions g where g.id::text=p_id and g.status='approved';
  end if;
  if owner is null or not public.ai_community_permission_for(owner) or exists(select 1 from private.suspensions where user_id=owner) then return null; end if;
  return value;
end $$;
revoke all on function public.moderation_recheck_candidate(text,text) from public,anon,authenticated;
grant execute on function public.moderation_recheck_candidate(text,text) to service_role;

create function public.moderation_recheck_finish(p_job uuid,p_lease uuid,p_snapshot jsonb,p_result text) returns boolean
language plpgsql security definer set search_path='' as $$
declare j private.moderation_rechecks; current_value jsonb;
begin
  select * into j from private.moderation_rechecks where id=p_job for update;
  if not found or j.state<>'pending' or p_lease is null or j.lease_id is distinct from p_lease or j.lease_until is null or j.lease_until<now() then return false; end if;
  if p_result='retry' then
    if j.attempts<2 then
      update private.moderation_rechecks set lease_id=null,lease_until=null,due_at=now()+interval '5 minutes' where id=j.id;
      return true;
    end if;
    -- Repeated provider failure becomes human review, without deleting the item.
    p_result:='hold';
    p_snapshot:=public.moderation_recheck_candidate(j.kind,j.source_id);
  end if;
  if p_result is null or p_result not in ('safe','hold','skip') then return false; end if;
  -- Lock the content before checking that its author, consent and wording did not change.
  if j.kind='confession' then perform 1 from public.confessions where id=j.source_id for update;
  elsif j.kind='discussion' then perform 1 from public.community_posts where id::text=j.source_id for update;
  elsif j.kind='prayer' then perform 1 from private.prayer_requests where id::text=j.source_id for update;
  elsif j.kind='testimony' then perform 1 from private.testimonies where id::text=j.source_id for update;
  elsif j.kind='comment' then perform 1 from public.comments where id::text=j.source_id for update;
  elsif j.kind='giving' then perform 1 from public.pay_forward_submissions where id::text=j.source_id for update;
  end if;
  current_value:=public.moderation_recheck_candidate(j.kind,j.source_id);
  if current_value is null or p_result='skip' then
    update private.moderation_rechecks set state='skipped',lease_id=null,lease_until=null where id=j.id;
    return true;
  end if;
  if current_value is distinct from p_snapshot then
    update private.moderation_rechecks set due_at=now(),lease_id=null,lease_until=null,attempts=0 where id=j.id;
    return true;
  end if;
  if p_result='hold' then
    if j.kind='confession' then update public.confessions set status='reported' where id=j.source_id and status='approved';
    elsif j.kind='discussion' then update public.community_posts set status='pending',reviewed_at=now() where id::text=j.source_id and status='approved';
    elsif j.kind='prayer' then update private.prayer_requests set status='pending',review_reason='Needs moderator review.' where id::text=j.source_id and status='approved';
    elsif j.kind='testimony' then update private.testimonies set status='pending',updated_at=now() where id::text=j.source_id and status='published'; update public.content_items set published=false where id='testimony-'||j.source_id;
    elsif j.kind='comment' then update public.comments set status='pending' where id::text=j.source_id and status='approved';
    elsif j.kind='giving' then update public.pay_forward_submissions set status='pending',reason='' where id::text=j.source_id and status='approved'; end if;
  end if;
  update private.moderation_rechecks set state='done',lease_id=null,lease_until=null where id=j.id;
  return true;
end $$;
revoke all on function public.moderation_recheck_finish(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.moderation_recheck_finish(uuid,uuid,jsonb,text) to service_role;

-- Jobs become due six hours after publication. A short scheduler interval
-- drains backlogs; if credentials are not configured, nothing is transmitted.
create function private.dispatch_moderation_rechecks() returns void language plpgsql security definer set search_path='' as $$
declare endpoint text; token text;
begin
  select decrypted_secret into endpoint from vault.decrypted_secrets where name='moderation_recheck_url' limit 1;
  select decrypted_secret into token from vault.decrypted_secrets where name='moderation_recheck_token' limit 1;
  if endpoint is null or token is null or endpoint !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/moderation-recheck$' then return; end if;
  if not exists(select 1 from private.moderation_rechecks where state='pending' and due_at<=now() and (lease_until is null or lease_until<now())) then return; end if;
  perform net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:='{}'::jsonb,timeout_milliseconds:=120000);
end $$;
revoke all on function private.dispatch_moderation_rechecks() from public,anon,authenticated;
select cron.schedule('grace-moderation-recheck','*/5 * * * *','select private.dispatch_moderation_rechecks()');
