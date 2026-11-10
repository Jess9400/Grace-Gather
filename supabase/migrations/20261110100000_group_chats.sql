-- Group chats: open rooms where any signed-in member can read and write.
-- They are public to the community, unlike friend chats, so every message can
-- be reported, its author can be blocked, and staff can remove it.
create table private.group_chats (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug ~ '^[a-z0-9-]{2,40}$'),
 -- Localized by the server so rooms can be added without an app release.
 title jsonb not null,
 description jsonb not null,
 position integer not null default 0,
 open boolean not null default true
);
create table private.group_messages (
 id uuid primary key default gen_random_uuid(),
 chat_id uuid not null references private.group_chats(id) on delete cascade,
 sender uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(trim(body)) between 1 and 1000),
 created_at timestamptz not null default now(),
 removed boolean not null default false
);
create index group_message_history on private.group_messages(chat_id,created_at desc,id);
create index group_message_rate on private.group_messages(sender,created_at);
create table private.group_reports (
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references private.group_messages(id) on delete cascade,
 reporter uuid not null references auth.users(id) on delete cascade,
 reason text not null check(char_length(trim(reason)) between 3 and 500),
 created_at timestamptz not null default now(),resolved boolean not null default false,
 unique(message_id,reporter)
);
create index group_report_open on private.group_reports(message_id) where not resolved;
alter table private.group_chats enable row level security;
alter table private.group_messages enable row level security;
alter table private.group_reports enable row level security;
revoke all on private.group_chats,private.group_messages,private.group_reports from public,anon,authenticated;

-- The first room: one chat for the whole community.
insert into private.group_chats(slug,title,description) values('everyone',
 '{"en":"Everyone","pt":"Todos","es":"Todos","ru":"Все вместе"}',
 '{"en":"One room for the whole community. Say hello, share a thought, pray for each other.","pt":"Uma sala para toda a comunidade. Diga olá, compartilhe um pensamento, orem uns pelos outros.","es":"Una sala para toda la comunidad. Saluda, comparte un pensamiento, oren unos por otros.","ru":"Одна комната для всей общины. Поздоровайтесь, поделитесь мыслью, помолитесь друг за друга."}');

-- All group-chat access goes through this authenticated command boundary.
create function private.group_chat_command(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid := auth.uid(); chat private.group_chats; msg private.group_messages; my_name text;
begin
 if u is null or not private.can_participate() or not exists(select 1 from auth.users where id=u and (email_confirmed_at is not null or phone_confirmed_at is not null)) then
  raise exception 'sign_in_required';
 end if;
 if octet_length(p_data::text)>6000 then raise exception 'invalid_input'; end if;
 -- Members write under the public name they chose for friends; never a profile or email.
 select name into my_name from private.friend_directory where user_id=u;
 if p_action='list' then
  return jsonb_build_object('me',case when my_name is null then null else jsonb_build_object('name',my_name) end,
   'chats',coalesce((select jsonb_agg(to_jsonb(x)-'position' order by x.position,x.slug) from (
    select c.id,c.slug,c.title,c.description,c.position,
     (select max(m.created_at) from private.group_messages m where m.chat_id=c.id and not m.removed) as latest_at
    from private.group_chats c where c.open) x),'[]'::jsonb));
 elsif p_action='name' then
  -- Sets the public name only; being findable in friend search stays as it was (off by default).
  insert into private.friend_directory(user_id,name,discoverable) values(u,trim(p_data->>'name'),false)
  on conflict(user_id) do update set name=excluded.name;
  return '{}'::jsonb;
 elsif p_action='reports' then
  if not private.is_staff() then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(x) from (
   select r.id,r.reason,m.body,coalesce(d.name,'') as name,r.created_at
   from private.group_reports r join private.group_messages m on m.id=r.message_id
   left join private.friend_directory d on d.user_id=m.sender
   where not r.resolved and not m.removed order by r.created_at limit 100) x),'[]'::jsonb);
 elsif p_action='resolve_report' then
  if not private.is_staff() then raise exception 'forbidden'; end if;
  select m.* into msg from private.group_messages m join private.group_reports r on r.message_id=m.id where r.id=(p_data->>'id')::uuid;
  if msg.id is null then raise exception 'forbidden'; end if;
  if coalesce((p_data->>'remove')::boolean,false) then
   update private.group_messages set removed=true where id=msg.id;
  end if;
  -- One decision settles every report of the same message.
  update private.group_reports set resolved=true where message_id=msg.id;
  return '{}'::jsonb;
 elsif p_action in('report','block') then
  select * into msg from private.group_messages where id=(p_data->>'message')::uuid and not removed and sender<>u;
  if msg.id is null then raise exception 'forbidden'; end if;
  if p_action='report' then
   insert into private.group_reports(message_id,reporter,reason) values(msg.id,u,trim(p_data->>'reason')) on conflict(message_id,reporter) do nothing;
  else
   -- The same block as in friend chats: it also ends any friendship or request.
   perform pg_advisory_xact_lock(hashtextextended(least(u,msg.sender)::text||greatest(u,msg.sender)::text,0));
   insert into private.friend_blocks values(u,msg.sender) on conflict do nothing;
   update private.friend_links set status='declined',updated_at=now() where least(sender,recipient)=least(u,msg.sender) and greatest(sender,recipient)=greatest(u,msg.sender);
  end if;
  return '{}'::jsonb;
 end if;
 select * into chat from private.group_chats where id=(p_data->>'chat')::uuid and open;
 if chat.id is null then raise exception 'unavailable'; end if;
 if p_action='messages' then
  -- Hidden from a reader: removed messages, suspended authors, anyone blocked in
  -- either direction, and messages with three open reports until staff decide.
  return coalesce((select jsonb_agg(x order by x.created_at,x.id) from (
   select m.id,m.body,coalesce(d.name,'') as name,m.sender=u as mine,m.created_at
   from private.group_messages m left join private.friend_directory d on d.user_id=m.sender
   where m.chat_id=chat.id and not m.removed
    and (p_data->>'before' is null or (m.created_at,m.id)<((p_data->>'before')::timestamptz,(p_data->>'beforeId')::uuid))
    and (m.sender=u or (
     not exists(select 1 from private.suspensions s where s.user_id=m.sender)
     and not exists(select 1 from private.friend_blocks b where (b.actor=u and b.target=m.sender) or (b.actor=m.sender and b.target=u))
     and not exists(select 1 from public.blocks b where (b.user_id=u and b.blocked_user_id=m.sender) or (b.user_id=m.sender and b.blocked_user_id=u))
     and (select count(*) from private.group_reports r where r.message_id=m.id and not r.resolved)<3))
   order by m.created_at desc,m.id desc limit 50) x),'[]'::jsonb);
 elsif p_action='send' then
  if my_name is null then raise exception 'name_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,3));
  if (select count(*) from private.group_messages where sender=u and created_at>now()-interval '1 minute')>=5
   or (select count(*) from private.group_messages where sender=u and created_at>now()-interval '1 hour')>=60 then raise exception 'rate_limited'; end if;
  insert into private.group_messages(chat_id,sender,body) values(chat.id,u,trim(p_data->>'body'));
  return '{}'::jsonb;
 end if;
 raise exception 'invalid_action';
end $$;
revoke all on function private.group_chat_command(text,jsonb) from public,anon,authenticated;
grant execute on function private.group_chat_command(text,jsonb) to authenticated;
create function public.group_chat_command(p_action text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select private.group_chat_command(p_action,p_data);$$;
revoke all on function public.group_chat_command(text,jsonb) from public,anon;
grant execute on function public.group_chat_command(text,jsonb) to authenticated;
