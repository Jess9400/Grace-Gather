-- In-app invitations are on for new accounts and accounts that never chose a
-- preference. Existing opt-outs are preserved. This does not grant push access.
-- A host can still revoke speaking permission for a disruptive participant;
-- unlike the old listener-by-default flag, the revocation survives reconnects.
alter table public.memberships add column speech_revoked boolean not null default false;
alter table private.prayer_preferences alter column enabled set default true;
insert into private.prayer_preferences(user_id, enabled)
select id, true from auth.users on conflict(user_id) do nothing;

create function private.default_prayer_preferences() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into private.prayer_preferences(user_id, enabled)
  values(new.id, true) on conflict(user_id) do nothing;
  return new;
end; $$;
revoke all on function private.default_prayer_preferences() from public, anon, authenticated;
create trigger default_prayer_preferences after insert on public.profiles
for each row execute function private.default_prayer_preferences();

-- Store only generic activity and an internal destination. No confession text,
-- audio, names or journal content goes into a notification.
create table private.activity_notices (
  id uuid primary key default gen_random_uuid(),
  recipient uuid not null references auth.users(id) on delete cascade,
  actor uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('confession_reply', 'discussion_reply')),
  target text not null,
  source text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique(recipient, kind, source)
);
create index activity_notices_owner on private.activity_notices(recipient, is_read, created_at desc);
alter table private.activity_notices enable row level security;
revoke all on private.activity_notices from public, anon, authenticated;

create function private.notify_confession_reply() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient_id uuid;
begin
  if new.kind <> 'reply' or new.status <> 'approved' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'approved' then return new; end if;
  select author into recipient_id from public.confessions where id = new.parent and closed = 0;
  if recipient_id is not null and recipient_id <> new.author and not exists(
    select 1 from public.confession_blocks b where
      (b.actor=recipient_id and b.target=new.author) or (b.actor=new.author and b.target=recipient_id)
  ) then
    insert into private.activity_notices(recipient, actor, kind, target, source)
    values(recipient_id, new.author, 'confession_reply', new.parent, new.id)
    on conflict do nothing;
  end if;
  return new;
end; $$;
revoke all on function private.notify_confession_reply() from public, anon, authenticated;
create trigger activity_confession_reply after insert or update of status on public.confessions
for each row execute function private.notify_confession_reply();

create function private.notify_discussion_reply() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.parent is null or new.status <> 'approved' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'approved' then return new; end if;
  insert into private.activity_notices(recipient, actor, kind, target, source)
  select distinct p.author, new.author, 'discussion_reply', new.parent::text, new.id::text
  from public.community_posts p
  join public.community_posts root on root.id = new.parent and root.status = 'approved'
  where (p.id = new.parent or (p.parent = new.parent and p.status = 'approved'))
    and p.author <> new.author
    and not exists(select 1 from public.blocks b where
      (b.user_id = p.author and b.blocked_user_id = new.author) or
      (b.user_id = new.author and b.blocked_user_id = p.author))
    and not exists(select 1 from private.suspensions s where s.user_id = p.author)
  on conflict do nothing;
  return new;
end; $$;
revoke all on function private.notify_discussion_reply() from public, anon, authenticated;
create trigger activity_discussion_reply after insert or update of status on public.community_posts
for each row execute function private.notify_discussion_reply();

create function private.activity_snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid := auth.uid(); result jsonb; pending_count integer := 0;
begin
  if u is null or not private.can_participate() then raise exception 'unauthorized'; end if;
  if private.is_staff() then
    select (select count(*) from public.confessions where status in ('pending','reported'))
      + (select count(*) from public.community_posts where status='pending')
      + (select count(*) from public.community_reports where not resolved)
      + (select count(*) from private.prayer_requests where status='pending')
      + (select count(distinct r.request_id) from private.prayer_reports r join private.prayer_requests p on p.id=r.request_id where p.status='approved')
      + (select count(*) from private.testimonies where status='pending')
      + (select count(*) from public.reports where status='open') into pending_count;
  end if;
  select jsonb_build_object('pendingModeration', pending_count,
    'unread', count(*) filter (where not n.is_read),
    'items', coalesce(jsonb_agg(jsonb_build_object('id',n.id,'kind',n.kind,'target',n.target,'is_read',n.is_read,'created_at',n.created_at) order by n.created_at desc),'[]'::jsonb))
  into result from (
    select * from private.activity_notices a where a.recipient=u
      and (a.actor is null or not exists(select 1 from public.blocks b where
        (b.user_id=u and b.blocked_user_id=a.actor) or (b.user_id=a.actor and b.blocked_user_id=u)))
      and (a.kind <> 'discussion_reply' or exists(select 1 from public.community_posts p where p.id::text=a.target and private.community_readable(p.id)))
      and (a.kind <> 'discussion_reply' or exists(select 1 from public.community_posts p where p.id::text=a.source and private.community_readable(p.id)))
      and (a.kind <> 'confession_reply' or (exists(select 1 from public.confessions c where c.id=a.target and c.author=u and c.closed=0)
        and not exists(select 1 from public.confession_blocks b where (b.actor=u and b.target=a.actor) or (b.actor=a.actor and b.target=u))))
    order by a.created_at desc limit 100
  ) n;
  return result;
end; $$;
create function private.activity_mark_read(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.can_participate() then raise exception 'unauthorized'; end if;
  update private.activity_notices set is_read=true where id=p_id and recipient=auth.uid();
end; $$;
revoke all on function private.activity_snapshot(), private.activity_mark_read(uuid) from public, anon;
grant execute on function private.activity_snapshot(), private.activity_mark_read(uuid) to authenticated;
create function public.activity_snapshot() returns jsonb language sql stable security invoker set search_path='' as $$ select private.activity_snapshot() $$;
create function public.activity_mark_read(p_id uuid) returns void language sql security invoker set search_path='' as $$ select private.activity_mark_read(p_id) $$;
revoke all on function public.activity_snapshot(), public.activity_mark_read(uuid) from public, anon;
grant execute on function public.activity_snapshot(), public.activity_mark_read(uuid) to authenticated;
