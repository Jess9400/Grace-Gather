-- Moderation priority is metadata only: never store a transcript or message here.
create table private.safety_review_flags (
  kind text not null check(kind in ('confession','discussion','prayer','testimony','comment','giving')),
  source_id text not null,
  created_at timestamptz not null default now(),
  primary key(kind,source_id)
);
alter table private.safety_review_flags enable row level security;
revoke all on private.safety_review_flags from public,anon,authenticated;

-- Gathering audio is not recorded or monitored. Members may explicitly
-- report a concern; the report stores only the words they choose to submit.
create table private.gathering_safety_reports (
  id uuid primary key default gen_random_uuid(),
  gathering_id uuid not null references public.gatherings(id) on delete cascade,
  reporter uuid not null references auth.users(id) on delete cascade,
  reason text not null check(char_length(trim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  unique(gathering_id,reporter)
);
alter table private.gathering_safety_reports enable row level security;
revoke all on private.gathering_safety_reports from public,anon,authenticated;
create index gathering_safety_reports_open on private.gathering_safety_reports(created_at) where not resolved;
create index gathering_safety_reports_reporter on private.gathering_safety_reports(reporter,created_at desc);

create function private.submit_gathering_safety_report(p_gathering uuid,p_invite text,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result uuid;
begin
 if u is null or not private.can_participate() or not exists(select 1 from auth.users where id=u and (email_confirmed_at is not null or phone_confirmed_at is not null)) then raise exception 'not_allowed'; end if;
 if p_gathering is null or char_length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'invalid_report'; end if;
 if not (private.gathering_visible(p_gathering) or exists(select 1 from private.gathering_invites i join public.gatherings g on g.id=i.gathering_id where i.gathering_id=p_gathering and g.status='published' and i.token::text=p_invite)) then raise exception 'not_allowed'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,92));
 if (select count(*) from private.gathering_safety_reports where reporter=u and created_at>now()-interval '1 hour')>=10 then raise exception 'rate_limited'; end if;
 insert into private.gathering_safety_reports(gathering_id,reporter,reason) values(p_gathering,u,trim(p_reason))
 on conflict(gathering_id,reporter) do update set reason=excluded.reason,resolved=false,created_at=now()
 where private.gathering_safety_reports.created_at < now()-interval '1 minute'
 returning id into result;
 if result is null then raise exception 'rate_limited'; end if;
 return result;
end $$;
revoke all on function private.submit_gathering_safety_report(uuid,text,text) from public,anon;
grant execute on function private.submit_gathering_safety_report(uuid,text,text) to authenticated;
create function public.submit_gathering_safety_report(p_gathering uuid,p_invite text,p_reason text) returns uuid
language sql security invoker set search_path='' as $$ select private.submit_gathering_safety_report(p_gathering,p_invite,p_reason) $$;
revoke all on function public.submit_gathering_safety_report(uuid,text,text) from public,anon;
grant execute on function public.submit_gathering_safety_report(uuid,text,text) to authenticated;

create function private.gathering_safety_report_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_staff() or not private.can_participate() then raise exception 'not_allowed' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(x order by x.created_at) from (select r.id,r.reason,r.created_at,g.title from private.gathering_safety_reports r join public.gatherings g on g.id=r.gathering_id where not r.resolved order by r.created_at limit 100) x),'[]'::jsonb);
end $$;
revoke all on function private.gathering_safety_report_queue() from public,anon;
grant execute on function private.gathering_safety_report_queue() to authenticated;
create function public.gathering_safety_report_queue() returns jsonb language sql stable security invoker set search_path='' as $$ select private.gathering_safety_report_queue() $$;
revoke all on function public.gathering_safety_report_queue() from public,anon;
grant execute on function public.gathering_safety_report_queue() to authenticated;

create function private.resolve_gathering_safety_report(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_staff() or not private.can_participate() then raise exception 'not_allowed' using errcode='42501'; end if;
 update private.gathering_safety_reports set resolved=true where id=p_id and not resolved;
 return found;
end $$;
revoke all on function private.resolve_gathering_safety_report(uuid) from public,anon;
grant execute on function private.resolve_gathering_safety_report(uuid) to authenticated;
create function public.resolve_gathering_safety_report(p_id uuid) returns boolean language sql security invoker set search_path='' as $$ select private.resolve_gathering_safety_report(p_id) $$;
revoke all on function public.resolve_gathering_safety_report(uuid) from public,anon;
grant execute on function public.resolve_gathering_safety_report(uuid) to authenticated;

-- Only trusted screening functions may mark the exact pending submission they
-- screened. Consent is rechecked and audio transcripts are never persisted.
create function public.record_safety_review(p_kind text,p_id text,p_actor uuid,p_snapshot jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare current_candidate jsonb; c public.confessions;
begin
  if p_actor is null or p_snapshot is null or not public.ai_community_permission_for(p_actor) then return false; end if;
  if p_kind='confession' then
    select * into c from public.confessions where id=p_id for update;
    if not found or c.author is distinct from p_actor or c.status<>'pending' or c.closed<>0
      or c.created::text is distinct from p_snapshot->>'created'
      or c.body is distinct from p_snapshot->>'body'
      or c.language is distinct from p_snapshot->>'language'
      or c.audio_type is distinct from p_snapshot->>'audioType'
      or not exists(select 1 from private.confession_ai_consent a where a.confession_id=c.id and a.author=c.author and (c.audio_type is null or a.audio_allowed))
    then return false; end if;
    update public.confessions set priority=least(priority,1),
      signals=case when signals::jsonb ? 'safety_context' then signals else (signals::jsonb || '["safety_context"]'::jsonb)::text end
      where id=c.id;
  elsif p_kind in ('testimony','comment','giving') then
    begin current_candidate:=public.text_moderation_candidate(p_kind,p_id::uuid,p_actor);
    exception when invalid_text_representation then return false; end;
    if current_candidate is null or current_candidate is distinct from p_snapshot then return false; end if;
  else return false; end if;
  insert into private.safety_review_flags(kind,source_id) values(p_kind,p_id)
    on conflict(kind,source_id) do update set created_at=now();
  return true;
end $$;
revoke all on function public.record_safety_review(text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.record_safety_review(text,text,uuid,jsonb) to service_role;

-- Once a decision is made, remove the marker; a later edit or new submission
-- must receive its own screening rather than inherit a stale flag.
create function private.clear_safety_flag() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' or (new.status::text<>'pending' and not (tg_argv[0]='confession' and new.status::text='reported')) then
    delete from private.safety_review_flags where kind=tg_argv[0] and source_id=old.id::text;
  elsif tg_argv[0]='testimony' and to_jsonb(new)->>'revision' is distinct from to_jsonb(old)->>'revision' then
    delete from private.safety_review_flags where kind='testimony' and source_id=old.id::text;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.clear_safety_flag() from public,anon,authenticated;
create trigger clear_confession_safety after update of status or delete on public.confessions for each row execute function private.clear_safety_flag('confession');
create trigger clear_discussion_safety after update of status or delete on public.community_posts for each row execute function private.clear_safety_flag('discussion');
create trigger clear_prayer_safety after update of status or delete on private.prayer_requests for each row execute function private.clear_safety_flag('prayer');
create trigger clear_testimony_safety after update of status,revision or delete on private.testimonies for each row execute function private.clear_safety_flag('testimony');
create trigger clear_comment_safety after update of status or delete on public.comments for each row execute function private.clear_safety_flag('comment');
create trigger clear_giving_safety after update of status or delete on public.pay_forward_submissions for each row execute function private.clear_safety_flag('giving');

-- Counts only; moderators open existing role-checked queues for actual content.
create function private.moderation_safety_counts() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_staff() or not private.can_participate() then raise exception 'Moderator access required.' using errcode='42501'; end if;
  return jsonb_build_object(
    'confessions',(select count(*) from public.confessions c where c.status in ('pending','reported') and (c.priority<2 or exists(select 1 from private.safety_review_flags f where f.kind='confession' and f.source_id=c.id) or exists(select 1 from public.confession_reports r where r.target=c.id and r.status='open'))),
    'discussions',(select count(*) from public.community_posts p where p.status='pending' and (exists(select 1 from private.community_screening s where s.post_id=p.id and s.flags && array['self_harm','threat','sexual_exploitation','harmful_advice']::text[]) or exists(select 1 from private.safety_review_flags f where f.kind='discussion' and f.source_id=p.id::text))) + (select count(*) from public.community_reports where not resolved),
    'prayers',(select count(*) from private.prayer_requests r where r.status='pending' and (r.screening_flags && array['self_harm','threat','sexual_exploitation','harmful_advice']::text[] or exists(select 1 from private.safety_review_flags f where f.kind='prayer' and f.source_id=r.id::text))) + (select count(*) from private.prayer_reports r join private.prayer_requests p on p.id=r.request_id where p.status='approved'),
    'testimonies',(select count(*) from private.safety_review_flags f join private.testimonies t on t.id::text=f.source_id where f.kind='testimony' and t.status='pending'),
    'giving',(select count(*) from private.safety_review_flags f join public.pay_forward_submissions g on g.id::text=f.source_id where f.kind='giving' and g.status='pending'),
    'stories',(select count(*) from private.safety_review_flags f join public.comments c on c.id::text=f.source_id where f.kind='comment' and c.status='pending') + (select count(*) from public.reports where status='open'),
    'chats',(select count(*) from private.friend_reports where not resolved) + (select count(*) from private.group_reports where not resolved),
    'gatherings',(select count(*) from private.gathering_safety_reports where not resolved)
  );
end $$;
revoke all on function private.moderation_safety_counts() from public,anon;
grant execute on function private.moderation_safety_counts() to authenticated;
create function public.moderation_safety_counts() returns jsonb language sql stable security invoker set search_path='' as $$ select private.moderation_safety_counts() $$;
revoke all on function public.moderation_safety_counts() from public,anon;
grant execute on function public.moderation_safety_counts() to authenticated;

-- IDs only, for marking existing moderator queues. This never returns content
-- and is not callable by ordinary members, including the content's author.
create function private.moderation_safety_ids(p_kind text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare ids jsonb;
begin
 if auth.uid() is null or not private.is_staff() or not private.can_participate() then raise exception 'Moderator access required.' using errcode='42501'; end if;
 if p_kind not in ('confessions','discussions','prayers','testimonies','giving','stories') then raise exception 'invalid_kind'; end if;
 select coalesce(jsonb_agg(id),'[]'::jsonb) into ids from (
  select distinct id from (
   select c.id as id from public.confessions c where p_kind='confessions' and c.status in ('pending','reported') and (c.priority<2 or exists(select 1 from private.safety_review_flags f where f.kind='confession' and f.source_id=c.id) or exists(select 1 from public.confession_reports r where r.target=c.id and r.status='open'))
   union all select p.id::text from public.community_posts p where p_kind='discussions' and p.status='pending' and (exists(select 1 from private.community_screening s where s.post_id=p.id and s.flags && array['self_harm','threat','sexual_exploitation','harmful_advice']::text[]) or exists(select 1 from private.safety_review_flags f where f.kind='discussion' and f.source_id=p.id::text))
   union all select r.post_id::text from public.community_reports r where p_kind='discussions' and not r.resolved
   union all select r.id::text from private.prayer_requests r where p_kind='prayers' and r.status='pending' and (r.screening_flags && array['self_harm','threat','sexual_exploitation','harmful_advice']::text[] or exists(select 1 from private.safety_review_flags f where f.kind='prayer' and f.source_id=r.id::text))
   union all select r.request_id::text from private.prayer_reports r join private.prayer_requests p on p.id=r.request_id where p_kind='prayers' and p.status='approved'
   union all select t.id::text from private.testimonies t join private.safety_review_flags f on f.kind='testimony' and f.source_id=t.id::text where p_kind='testimonies' and t.status='pending'
   union all select g.id::text from public.pay_forward_submissions g join private.safety_review_flags f on f.kind='giving' and f.source_id=g.id::text where p_kind='giving' and g.status='pending'
   union all select c.id::text from public.comments c join private.safety_review_flags f on f.kind='comment' and f.source_id=c.id::text where p_kind='stories' and c.status='pending'
   union all select r.comment_id::text from public.reports r where p_kind='stories' and r.status='open' and r.comment_id is not null
  ) priority_ids limit 1000
 ) bounded;
 return ids;
end $$;
revoke all on function private.moderation_safety_ids(text) from public,anon;
grant execute on function private.moderation_safety_ids(text) to authenticated;
create function public.moderation_safety_ids(p_kind text) returns jsonb language sql stable security invoker set search_path='' as $$ select private.moderation_safety_ids(p_kind) $$;
revoke all on function public.moderation_safety_ids(text) from public,anon;
grant execute on function public.moderation_safety_ids(text) to authenticated;

-- Private-message content is never scanned; a member report, however, needs
-- moderator attention. Reuse the existing push queue without message content.
create or replace function private.moderation_item_pending(p_category text,p_id text) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 case p_category
 when 'confession' then return exists(select 1 from public.confessions where id=p_id and status in ('pending','reported'));
 when 'discussion' then return exists(select 1 from public.community_posts where id::text=p_id and status='pending');
 when 'testimony' then return exists(select 1 from private.testimonies where id::text=p_id and status='pending');
 when 'prayer' then return exists(select 1 from private.prayer_requests where id::text=p_id and status='pending');
 when 'community_report' then return exists(select 1 from public.community_reports where id::text=p_id and not resolved);
 when 'prayer_report' then return exists(select 1 from private.prayer_reports r join private.prayer_requests p on p.id=r.request_id where r.request_id::text=p_id and p.status='approved');
 when 'report' then return exists(select 1 from public.reports where id::text=p_id and status='open');
 when 'friend_report' then return exists(select 1 from private.friend_reports where id::text=p_id and not resolved);
 when 'group_report' then return exists(select 1 from private.group_reports where id::text=p_id and not resolved);
 when 'gathering_report' then return exists(select 1 from private.gathering_safety_reports where id::text=p_id and not resolved);
 when 'comment' then return exists(select 1 from public.comments where id::text=p_id and status='pending');
 when 'giving' then return exists(select 1 from public.pay_forward_submissions where id::text=p_id and status='pending');
 else return false; end case;
end $$;
revoke all on function private.moderation_item_pending(text,text) from public,anon,authenticated;
-- Avoid duplicate queued alerts when a report and a status change occur in
-- the same transaction; already-sent alerts can still be followed by a new one.
create or replace function private.queue_moderator_push() returns trigger language plpgsql security definer set search_path='' as $$
declare n jsonb:=to_jsonb(new); o jsonb; v_category text:=tg_argv[0]; v_source text;
begin
 if tg_op='UPDATE' then o:=to_jsonb(old); if n->>'status'=o->>'status' then return new; end if; end if;
 if v_category in ('confession','discussion','testimony','prayer','comment','giving') and n->>'status' not in ('pending','reported') then return new; end if;
 if v_category='report' and coalesce(n->>'status','open')<>'open' then return new; end if;
 v_source:=coalesce(n->>'id',n->>'request_id');
 insert into private.moderator_push_queue(user_id,token,category,source_id)
 select d.user_id,d.token,v_category,v_source from private.moderator_devices d join private.staff s on s.user_id=d.user_id
 where not exists(select 1 from private.suspensions x where x.user_id=d.user_id)
   and not exists(select 1 from private.moderator_push_queue q where q.user_id=d.user_id and q.token=d.token and q.category=v_category and q.source_id=v_source and q.state='pending');
 return new;
end $$;
revoke all on function private.queue_moderator_push() from public,anon,authenticated;
create trigger push_friend_report after insert on private.friend_reports for each row execute function private.queue_moderator_push('friend_report');
create trigger push_group_report after insert on private.group_reports for each row execute function private.queue_moderator_push('group_report');

-- Pushes identify only that a review is needed, never the content or sender.
-- All member reports need review; model flags are suggestions, not diagnoses.
create function private.moderation_is_priority(p_category text,p_id text) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
  if p_category in ('report','community_report','prayer_report','friend_report','group_report','gathering_report') then return true; end if;
  if p_category='confession' then
    return exists(select 1 from public.confessions c where c.id=p_id and (c.priority<2 or exists(select 1 from public.confession_reports r where r.target=c.id and r.status='open')))
      or exists(select 1 from private.safety_review_flags where kind='confession' and source_id=p_id);
  elsif p_category='discussion' then
    return exists(select 1 from private.community_screening where post_id::text=p_id and flags && array['self_harm','threat','sexual_exploitation','harmful_advice']::text[]) or exists(select 1 from private.safety_review_flags where kind='discussion' and source_id=p_id);
  elsif p_category='prayer' then
    return exists(select 1 from private.prayer_requests where id::text=p_id and screening_flags && array['self_harm','threat','sexual_exploitation','harmful_advice']::text[]) or exists(select 1 from private.safety_review_flags where kind='prayer' and source_id=p_id);
  end if;
  return exists(select 1 from private.safety_review_flags where kind=p_category and source_id=p_id);
end $$;
revoke all on function private.moderation_is_priority(text,text) from public,anon,authenticated;

-- A flag can arrive after the original push was sent. Queue a new priority
-- notice, or accelerate an existing pending one, without retaining content.
create function private.promote_safety_push(p_category text,p_id text) returns void
language plpgsql security definer set search_path='' as $$
begin
  update private.moderator_push_queue set due_at=least(due_at,now())
    where category=p_category and source_id=p_id and state='pending';
  insert into private.moderator_push_queue(user_id,token,category,source_id,due_at)
    select d.user_id,d.token,p_category,p_id,now() from private.moderator_devices d
    join private.staff s on s.user_id=d.user_id
    where not exists(select 1 from private.suspensions x where x.user_id=d.user_id)
      and not exists(select 1 from private.moderator_push_queue q where q.user_id=d.user_id and q.token=d.token and q.category=p_category and q.source_id=p_id and q.state='pending');
end $$;
revoke all on function private.promote_safety_push(text,text) from public,anon,authenticated;
create function private.on_safety_review_flag() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.promote_safety_push(new.kind,new.source_id); return new; end $$;
revoke all on function private.on_safety_review_flag() from public,anon,authenticated;
create trigger safety_flag_push after insert or update on private.safety_review_flags for each row execute function private.on_safety_review_flag();
create function private.on_confession_safety_report() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.status='open' then perform private.promote_safety_push('confession',new.target); end if; return new; end $$;
revoke all on function private.on_confession_safety_report() from public,anon,authenticated;
create trigger confession_safety_report_push after insert on public.confession_reports for each row execute function private.on_confession_safety_report();
create function private.on_reopened_community_report() returns trigger language plpgsql security definer set search_path='' as $$
begin if old.resolved and not new.resolved then perform private.promote_safety_push('community_report',new.id::text); end if; return new; end $$;
revoke all on function private.on_reopened_community_report() from public,anon,authenticated;
create trigger community_reopened_safety_push after update of resolved on public.community_reports for each row execute function private.on_reopened_community_report();
create function private.on_community_safety_flag() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.flags && array['self_harm','threat','sexual_exploitation','harmful_advice']::text[] then perform private.promote_safety_push('discussion',new.post_id::text); end if;
 return new;
end $$;
revoke all on function private.on_community_safety_flag() from public,anon,authenticated;
create trigger community_safety_push after insert or update of flags on private.community_screening for each row execute function private.on_community_safety_flag();
create function private.on_prayer_safety_flag() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='pending' and new.screening_flags && array['self_harm','threat','sexual_exploitation','harmful_advice']::text[] then perform private.promote_safety_push('prayer',new.id::text); end if;
 return new;
end $$;
revoke all on function private.on_prayer_safety_flag() from public,anon,authenticated;
create trigger prayer_safety_push after update of screening_flags on private.prayer_requests for each row execute function private.on_prayer_safety_flag();
create function private.on_gathering_safety_report() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.resolved then perform private.promote_safety_push('gathering_report',new.id::text); end if;
 return new;
end $$;
revoke all on function private.on_gathering_safety_report() from public,anon,authenticated;
create trigger gathering_safety_push after insert or update of reason,resolved on private.gathering_safety_reports for each row execute function private.on_gathering_safety_report();

-- Preserve retry, delivery-receipt, and cancellation behavior.
create or replace function private.dispatch_moderator_pushes() returns void language plpgsql security definer set search_path='' as $$
declare j private.moderator_push_queue; r record; payload jsonb; ticket jsonb; expo_key text; headers jsonb;
begin
 delete from private.moderator_push_queue where created_at<now()-interval '30 days' and state in ('sent','cancelled','failed');
 select decrypted_secret into expo_key from vault.decrypted_secrets where name='expo_push_access_token' limit 1;
 headers:=jsonb_build_object('Content-Type','application/json');
 if expo_key is not null and expo_key<>'' then headers:=headers||jsonb_build_object('Authorization','Bearer '||expo_key); end if;
 for j in select * from private.moderator_push_queue where state='sending' for update skip locked limit 100 loop
  select status_code,content,timed_out,error_msg into r from net._http_response where id=j.request_id;
  if found then
   if r.status_code=200 and not r.timed_out and r.error_msg is null then
    begin payload:=r.content::jsonb; ticket:=payload->'data'; exception when others then ticket:=null; end;
    if ticket->>'status'='ok' and ticket->>'id' is not null then
     update private.moderator_push_queue set state='ticketed',ticket_id=ticket->>'id',due_at=now()+interval '15 minutes' where id=j.id;
    elsif ticket->'details'->>'error'='DeviceNotRegistered' then
     delete from private.moderator_devices where user_id=j.user_id and token=j.token;
    else update private.moderator_push_queue set state=case when attempts<3 then 'pending' else 'failed' end,due_at=now()+interval '2 minutes' where id=j.id; end if;
   else update private.moderator_push_queue set state=case when attempts<3 then 'pending' else 'failed' end,due_at=now()+interval '2 minutes' where id=j.id; end if;
  elsif j.due_at < now()-interval '5 minutes' then
   update private.moderator_push_queue set state=case when attempts<3 then 'pending' else 'failed' end,due_at=now()+interval '2 minutes' where id=j.id;
  end if;
 end loop;
 -- Expo tickets are acknowledgements, not delivery confirmation. Check APNs
 -- receipts and remove tokens that Apple reports as no longer registered.
 for j in select * from private.moderator_push_queue where state='ticketed' and due_at<=now() for update skip locked limit 100 loop
  if j.receipt_request_id is null then
   update private.moderator_push_queue set receipt_request_id=net.http_post(
    url:='https://exp.host/--/api/v2/push/getReceipts',headers:=headers,
    body:=jsonb_build_object('ids',jsonb_build_array(j.ticket_id))
   ),due_at=now()+interval '1 minute' where id=j.id;
  else
   select status_code,content,timed_out,error_msg into r from net._http_response where id=j.receipt_request_id;
   if found and r.status_code=200 and not r.timed_out and r.error_msg is null then
    begin payload:=r.content::jsonb; ticket:=payload->'data'->j.ticket_id; exception when others then ticket:=null; end;
    if ticket->>'status'='ok' then update private.moderator_push_queue set state='sent' where id=j.id;
    elsif ticket->'details'->>'error'='DeviceNotRegistered' then delete from private.moderator_devices where user_id=j.user_id and token=j.token;
    elsif ticket->>'status'='error' then update private.moderator_push_queue set state='failed' where id=j.id;
    elsif j.created_at<now()-interval '23 hours' then update private.moderator_push_queue set state='failed' where id=j.id;
    else update private.moderator_push_queue set receipt_request_id=null,due_at=now()+interval '5 minutes' where id=j.id; end if;
   elsif j.created_at<now()-interval '23 hours' then update private.moderator_push_queue set state='failed' where id=j.id;
   else update private.moderator_push_queue set receipt_request_id=null,due_at=now()+interval '5 minutes' where id=j.id; end if;
  end if;
 end loop;
 for j in select * from private.moderator_push_queue where state='pending' and due_at<=now() order by due_at for update skip locked limit 50 loop
  if not exists(select 1 from private.staff s where s.user_id=j.user_id) or not private.moderation_item_pending(j.category,j.source_id) then
   update private.moderator_push_queue set state='cancelled' where id=j.id; continue;
  end if;
  update private.moderator_push_queue set state='sending',attempts=attempts+1,due_at=now(),request_id=net.http_post(
   url:='https://exp.host/--/api/v2/push/send',headers:=headers,
   body:=jsonb_build_object('to',j.token,'title','Grace & Gather','body',case when private.moderation_is_priority(j.category,j.source_id) then 'A safety flag or member report needs review.' else 'A community item needs your review.' end,'sound','default','data',jsonb_build_object('screen','admin'))
  ) where id=j.id;
 end loop;
end; $$;
revoke all on function private.dispatch_moderator_pushes() from public,anon,authenticated;

-- Preserve the same transactional snapshot and lease checks for rechecks.
create function public.moderation_recheck_finish_priority(p_job uuid,p_lease uuid,p_snapshot jsonb,p_result text,p_priority boolean) returns boolean
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
  if p_result='hold' and p_priority is true then
    insert into private.safety_review_flags(kind,source_id) values(j.kind,j.source_id)
      on conflict(kind,source_id) do update set created_at=now();
  end if;
  update private.moderation_rechecks set state='done',lease_id=null,lease_until=null where id=j.id;
  return true;
end $$;
revoke all on function public.moderation_recheck_finish_priority(uuid,uuid,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.moderation_recheck_finish_priority(uuid,uuid,jsonb,text,boolean) to service_role;
