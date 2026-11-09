-- Opt-in member directory; no private profile/email fields are exposed.
create table private.friend_directory (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(char_length(trim(name)) between 2 and 40),
 discoverable boolean not null default false
);
create table private.friend_links (
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references auth.users(id) on delete cascade,
 recipient uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 updated_at timestamptz not null default now(),
 check(sender<>recipient)
);
create unique index friend_pair on private.friend_links(least(sender,recipient),greatest(sender,recipient));
create index friend_recipient on private.friend_links(recipient);
create index friend_sender on private.friend_links(sender);
create table private.friend_blocks (
 actor uuid references auth.users(id) on delete cascade,
 target uuid references auth.users(id) on delete cascade,
 primary key(actor,target),check(actor<>target)
);
create table private.friend_messages (
 id uuid primary key default gen_random_uuid(),
 link_id uuid not null references private.friend_links(id) on delete cascade,
 sender uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(trim(body)) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index friend_message_history on private.friend_messages(link_id,created_at desc,id);
create index friend_message_rate on private.friend_messages(sender,created_at);
create table private.friend_reports (
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references private.friend_messages(id) on delete cascade,
 reporter uuid not null references auth.users(id) on delete cascade,
 reason text not null check(char_length(trim(reason)) between 3 and 500),
 created_at timestamptz not null default now(),resolved boolean not null default false,
 unique(message_id,reporter)
);
alter table private.friend_directory enable row level security;
alter table private.friend_links enable row level security;
alter table private.friend_blocks enable row level security;
alter table private.friend_messages enable row level security;
alter table private.friend_reports enable row level security;
revoke all on private.friend_directory,private.friend_links,private.friend_blocks,private.friend_messages,private.friend_reports from public,anon,authenticated;

-- All private-table access is bounded by this authenticated command boundary.
create function private.friends_command(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid := auth.uid(); target_id uuid; link private.friend_links; result jsonb;
 q text := trim(coalesce(p_data->>'query','')); msg private.friend_messages;
begin
 if u is null or not private.can_participate() or not exists(select 1 from auth.users where id=u and (email_confirmed_at is not null or phone_confirmed_at is not null)) then
  raise exception 'sign_in_required';
 end if;
 if octet_length(p_data::text)>12000 then raise exception 'invalid_input'; end if;
 if p_action='directory' then
  insert into private.friend_directory(user_id,name,discoverable) values(u,trim(p_data->>'name'),coalesce((p_data->>'discoverable')::boolean,false))
  on conflict(user_id) do update set name=excluded.name,discoverable=excluded.discoverable;
  return '{}'::jsonb;
 elsif p_action='list' then
  select jsonb_build_object('me', (select to_jsonb(d) - 'user_id' from private.friend_directory d where d.user_id=u),
   'links',coalesce((select jsonb_agg(x order by x.updated_at desc) from (
    select l.id,l.status,l.sender=u as outgoing,l.updated_at,d.name,d.user_id as peer
    from private.friend_links l join private.friend_directory d on d.user_id=case when l.sender=u then l.recipient else l.sender end
    where u in(l.sender,l.recipient) and l.status in('pending','accepted')
     and not exists(select 1 from private.friend_blocks b where (b.actor=u and b.target=d.user_id) or (b.actor=d.user_id and b.target=u))
    order by l.updated_at desc limit 200) x),'[]'::jsonb),
   'blocked',coalesce((select jsonb_agg(jsonb_build_object('peer',b.target,'name',d.name)) from private.friend_blocks b join private.friend_directory d on d.user_id=b.target where b.actor=u),'[]'::jsonb)) into result;
  return result;
 elsif p_action='search' then
  if char_length(q)<2 or char_length(q)>60 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(x) from (select d.user_id as peer,d.name from private.friend_directory d
   where d.discoverable and d.user_id<>u and position(lower(q) in lower(d.name))>0
   and not exists(select 1 from private.suspensions s where s.user_id=d.user_id)
   and not exists(select 1 from private.friend_blocks b where (b.actor=u and b.target=d.user_id) or (b.actor=d.user_id and b.target=u))
   order by lower(d.name),d.user_id limit 20) x),'[]'::jsonb);
 elsif p_action in('request','block','unblock') then
  target_id := (p_data->>'peer')::uuid;
  if target_id is null or target_id=u then raise exception 'invalid_target'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(u,target_id)::text||greatest(u,target_id)::text,0));
  if p_action='block' then
   insert into private.friend_blocks values(u,target_id) on conflict do nothing;
   update private.friend_links set status='declined',updated_at=now() where least(sender,recipient)=least(u,target_id) and greatest(sender,recipient)=greatest(u,target_id);
  elsif p_action='unblock' then
   delete from private.friend_blocks where actor=u and target=target_id;
  else
   perform pg_advisory_xact_lock(hashtextextended(u::text,1));
   if not exists(select 1 from private.friend_directory where user_id=u) or not exists(select 1 from private.friend_directory where user_id=target_id and discoverable)
    or exists(select 1 from private.suspensions where user_id=target_id)
    or exists(select 1 from private.friend_blocks where (actor=u and target=target_id) or(actor=target_id and target=u)) then raise exception 'unavailable'; end if;
   if (select count(*) from private.friend_links where sender=u and updated_at>now()-interval '1 day')>=20 then raise exception 'rate_limited'; end if;
   insert into private.friend_links(sender,recipient) values(u,target_id) on conflict do nothing;
   -- A declined request has a cooldown; crossed requests never auto-accept.
   update private.friend_links set sender=u,recipient=target_id,status='pending',updated_at=now()
    where least(sender,recipient)=least(u,target_id) and greatest(sender,recipient)=greatest(u,target_id)
    and status='declined' and updated_at<now()-interval '7 days';
  end if;
  return '{}'::jsonb;
 elsif p_action='reports' then
  if not private.is_staff() then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(x) from (select r.id,r.reason,m.body,r.created_at from private.friend_reports r join private.friend_messages m on m.id=r.message_id where not r.resolved order by r.created_at limit 100) x),'[]'::jsonb);
 elsif p_action='resolve_report' then
  if not private.is_staff() then raise exception 'forbidden'; end if;
  update private.friend_reports set resolved=true where id=(p_data->>'id')::uuid;
  return '{}'::jsonb;
 end if;
 select * into link from private.friend_links where id=(p_data->>'id')::uuid and u in(sender,recipient) for update;
 if link.id is null then raise exception 'forbidden'; end if;
 target_id := case when link.sender=u then link.recipient else link.sender end;
 if p_action in('accept','decline','remove') then
  if p_action='accept' and (link.recipient<>u or link.status<>'pending') then raise exception 'forbidden'; end if;
  if p_action='accept' and (exists(select 1 from private.friend_blocks where (actor=u and target=target_id) or(actor=target_id and target=u)) or exists(select 1 from private.suspensions where user_id=target_id)) then raise exception 'unavailable'; end if;
  update private.friend_links set status=case when p_action='accept' then 'accepted' else 'declined' end,updated_at=now() where id=link.id;
  return '{}'::jsonb;
 elsif p_action='report' then
  select * into msg from private.friend_messages where id=(p_data->>'message')::uuid and link_id=link.id and sender<>u;
  if msg.id is null then raise exception 'forbidden'; end if;
  insert into private.friend_reports(message_id,reporter,reason) values(msg.id,u,trim(p_data->>'reason')) on conflict(message_id,reporter) do nothing;
  return '{}'::jsonb;
 end if;
 if link.status<>'accepted' or exists(select 1 from private.friend_blocks where (actor=u and target=target_id) or(actor=target_id and target=u)) or exists(select 1 from private.suspensions where user_id=target_id) then raise exception 'unavailable'; end if;
 if p_action='messages' then
  return coalesce((select jsonb_agg(x order by x.created_at,x.id) from (
   select id,body,sender=u as mine,created_at from private.friend_messages where link_id=link.id
    and (p_data->>'before' is null or (created_at,id)<((p_data->>'before')::timestamptz,(p_data->>'beforeId')::uuid))
    order by created_at desc,id desc limit 50) x),'[]'::jsonb);
 elsif p_action='send' then
  perform pg_advisory_xact_lock(hashtextextended(u::text,2));
  if (select count(*) from private.friend_messages where sender=u and created_at>now()-interval '1 minute')>=20 then raise exception 'rate_limited'; end if;
  insert into private.friend_messages(link_id,sender,body) values(link.id,u,trim(p_data->>'body'));
  return '{}'::jsonb;
 end if;
 raise exception 'invalid_action';
end $$;
revoke all on function private.friends_command(text,jsonb) from public,anon,authenticated;
grant execute on function private.friends_command(text,jsonb) to authenticated;
create function public.friends_command(p_action text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select private.friends_command(p_action,p_data);$$;
revoke all on function public.friends_command(text,jsonb) from public,anon;
grant execute on function public.friends_command(text,jsonb) to authenticated;
