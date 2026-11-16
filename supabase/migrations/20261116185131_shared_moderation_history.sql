-- Service-only compare-and-set keeps a stale moderator from undoing a newer
-- decision. The status check and audit insert commit in the same transaction.
create function public.confession_moderate_once(p_id text, p_decision text, p_actor uuid, p_note text, p_expected_status text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  if p_decision not in ('approved','rejected') or p_expected_status not in ('pending','reported')
     or p_actor is null or length(trim(coalesce(p_note,''))) not between 5 and 500 then
    return false;
  end if;
  update public.confessions set status = p_decision
    where id = p_id and status = p_expected_status and author <> p_actor;
  get diagnostics n = row_count;
  if n <> 1 then return false; end if;
  update public.confession_reports set status = 'reviewed' where target = p_id and status = 'open';
  insert into public.confession_audit values
    (gen_random_uuid()::text, p_actor, p_decision, p_id, trim(p_note), floor(extract(epoch from clock_timestamp()) * 1000)::bigint);
  return true;
end $$;
revoke all on function public.confession_moderate_once(text,text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.confession_moderate_once(text,text,uuid,text,text) to service_role;

-- The discussion queue contains pending posts. A second moderator must not
-- silently undo the first decision after both opened the same queue.
create or replace function public.community_review(p_post uuid,p_approve boolean)
returns void language plpgsql security definer set search_path='' as $$
declare target public.community_posts;
begin
 if not private.community_moderator() or p_approve is null then raise exception 'not_allowed'; end if;
 select * into target from public.community_posts where id=p_post for update;
 if target.id is null then raise exception 'not_found'; end if;
 if target.status <> 'pending' then raise exception 'already_reviewed'; end if;
 if p_approve and exists(select 1 from private.suspensions where user_id=target.author) then raise exception 'not_allowed'; end if;
 if p_approve and target.parent is not null and not exists(select 1 from public.community_posts where id=target.parent and status='approved') then raise exception 'not_found'; end if;
 update public.community_posts set status=case when p_approve then 'approved' else 'removed' end, reviewed_at=now() where id=p_post;
 insert into private.community_audit(actor,post_id,action) values(auth.uid(),p_post,case when p_approve then 'approve' else 'reject' end);
end $$;
revoke all on function public.community_review(uuid,boolean) from public, anon;
grant execute on function public.community_review(uuid,boolean) to authenticated;

-- Only return records that still exist; user deletion is respected. This view
-- is a list of currently rejected/removed submissions, not a copy of private
-- messages into a second database or a journal-monitoring tool.
create function private.rejected_moderation_items(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_staff() then
    raise exception 'Moderator access required.' using errcode = '42501';
  end if;
  if p_offset < 0 or p_offset > 10000 then raise exception 'Invalid page'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(q) order by q.submitted_at desc, q.id desc), '[]'::jsonb)
    from (
      select * from (
        select c.id, case when c.kind = 'reply' then 'comfort' else 'confession' end as category,
          c.body, c.theme as title, to_timestamp(c.created / 1000.0) as submitted_at,
          c.audio_type is not null as has_audio, coalesce(a.note, '') as reason
        from public.confessions c
        left join lateral (select note from public.confession_audit where target = c.id and action = 'rejected' order by created desc limit 1) a on true
        where c.status = 'rejected'
        union all
        select p.id::text, 'discussion', p.body, coalesce(p.title, p.reference, ''), p.created_at, false, ''
          from public.community_posts p where p.status = 'removed'
        union all
        select t.id::text, 'testimony', t.body, t.title, t.created_at, false, t.rejection_reason
          from private.testimonies t where t.status = 'rejected'
        union all
        select p.id::text, 'prayer', p.reason, p.theme, p.created_at, false, p.review_reason
          from private.prayer_requests p where p.status = 'rejected'
        union all
        select c.id::text, 'comment', c.body, '', c.created_at, false, ''
          from public.comments c where c.status = 'removed'
        union all
        select s.id::text, 'giving', s.body, s.title, s.created_at, false, s.reason
          from public.pay_forward_submissions s where s.status = 'rejected'
      ) all_items order by submitted_at desc, id desc limit 50 offset p_offset
    ) q);
end $$;
revoke all on function private.rejected_moderation_items(integer) from public, anon;
grant execute on function private.rejected_moderation_items(integer) to authenticated;
create function public.rejected_moderation_items(p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.rejected_moderation_items(p_offset)
$$;
revoke all on function public.rejected_moderation_items(integer) from public, anon;
grant execute on function public.rejected_moderation_items(integer) to authenticated;
