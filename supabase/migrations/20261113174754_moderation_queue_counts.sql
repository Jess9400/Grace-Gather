-- Only counts are exposed; the existing moderation queues enforce their own
-- access checks and contain the actual records.
create function public.moderation_queue_counts() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not private.is_staff() then
    raise exception 'Moderator access required.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'discussions', (select count(*) from public.community_posts where status = 'pending')
      + (select count(*) from public.community_reports where not resolved),
    'confessions', (select count(*) from public.confessions where status in ('pending','reported')),
    'testimonies', (select count(*) from private.testimonies where status = 'pending'),
    'prayers', (select count(*) from private.prayer_requests where status = 'pending')
      + (select count(distinct r.request_id) from private.prayer_reports r
         join private.prayer_requests p on p.id = r.request_id where p.status = 'approved'),
    'giving', (select count(*) from public.pay_forward_submissions where status = 'pending'),
    'stories', (select count(*) from public.comments where status = 'pending')
      + (select count(*) from public.reports where status = 'open')
  );
end $$;
revoke all on function public.moderation_queue_counts() from public, anon, authenticated;
grant execute on function public.moderation_queue_counts() to authenticated;
