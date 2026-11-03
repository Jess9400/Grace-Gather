-- Update reminder branding without changing previously applied migrations.
create or replace function public.queue_gathering_reminders() returns void language sql security definer set search_path='' as $$
 insert into private.delivery_jobs(user_id,channel,kind,subject,body,due_at,unique_key)
 select m.user_id,channel,'gathering','Grace & Gather','Your gathering starts in one hour. Open Grace & Gather for details.',g.starts_at-interval '1 hour',g.id::text||':'||g.starts_at::text||':'||m.user_id::text||':'||channel
 from public.memberships m join public.gatherings g on g.id=m.gathering_id cross join (values('email'),('push')) as ch(channel)
 where g.status='published' and g.starts_at>now() and g.starts_at<now()+interval '25 hours'
 on conflict(unique_key) do nothing;
$$;
revoke all on function public.queue_gathering_reminders() from public,anon,authenticated;
grant execute on function public.queue_gathering_reminders() to service_role;
update private.delivery_jobs set subject='Grace & Gather',body=replace(body,'Away Church','Grace & Gather') where kind='gathering' and state='pending' and subject='Away Church';
