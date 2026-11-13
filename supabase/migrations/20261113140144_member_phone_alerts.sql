-- Phone alerts are opt-in per device. Payloads contain no message, prayer,
-- confession, sender or other identifying details.
create table private.member_push_devices (
 user_id uuid not null references auth.users(id) on delete cascade,
 token text primary key check(token ~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$' and length(token)<300),
 language text not null check(language in ('en','pt','es','ru')),
 updated_at timestamptz not null default now(),
 unique(user_id,token)
);
alter table private.member_push_devices enable row level security;
revoke all on private.member_push_devices from public,anon,authenticated;

create function private.member_push_device(p_token text,p_enable boolean,p_language text default 'en') returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'not_allowed'; end if;
 if p_token is null or p_token !~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$' or length(p_token)>=300 then raise exception 'invalid_token'; end if;
 if p_enable then
  if not private.can_participate() then raise exception 'not_allowed'; end if;
  if p_language not in ('en','pt','es','ru') or p_language is null then raise exception 'invalid_language'; end if;
  -- A phone belongs to the current signed-in account, not a prior user.
  delete from private.member_push_devices where token=p_token and user_id<>u;
  insert into private.member_push_devices(user_id,token,language) values(u,p_token,p_language)
  on conflict(token) do update set user_id=excluded.user_id,language=excluded.language,updated_at=now();
 else
  delete from private.member_push_devices where user_id=u and token=p_token;
 end if;
end; $$;
revoke all on function private.member_push_device(text,boolean,text) from public,anon;
grant execute on function private.member_push_device(text,boolean,text) to authenticated;
create function public.member_push_device(p_token text,p_enable boolean,p_language text default 'en') returns void
language sql security invoker set search_path='' as $$ select private.member_push_device(p_token,p_enable,p_language) $$;
revoke all on function public.member_push_device(text,boolean,text) from public,anon;
grant execute on function public.member_push_device(text,boolean,text) to authenticated;
create function private.member_push_enabled(p_token text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from private.member_push_devices where user_id=auth.uid() and token=p_token);
$$;
revoke all on function private.member_push_enabled(text) from public,anon;
grant execute on function private.member_push_enabled(text) to authenticated;
create function public.member_push_enabled(p_token text) returns boolean language sql stable security invoker set search_path='' as $$ select private.member_push_enabled(p_token) $$;
revoke all on function public.member_push_enabled(text) from public,anon;
grant execute on function public.member_push_enabled(text) to authenticated;

create table private.member_push_queue (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, token text not null,
 kind text not null check(kind in ('activity','message','friendship','testimony_comment','prayer','gathering')),
 source_id uuid not null, group_key text not null default '', created_at timestamptz not null default now(),
 due_at timestamptz not null default now()+interval '30 seconds',
 state text not null default 'pending' check(state in ('pending','retry','sending','ticketed','sent','cancelled','failed')),
 attempts integer not null default 0, request_id bigint, ticket_id text, receipt_request_id bigint,
 foreign key(user_id,token) references private.member_push_devices(user_id,token) on delete cascade
);
alter table private.member_push_queue enable row level security;
revoke all on private.member_push_queue from public,anon,authenticated;
create index member_push_due on private.member_push_queue(state,due_at);
-- Coalesce bursts while a notification is waiting, avoiding one alert per message.
create unique index member_push_pending on private.member_push_queue(user_id,token,kind,group_key) where state='pending';

create function private.queue_member_push(p_user uuid,p_kind text,p_source uuid,p_group text default '') returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_user is null or p_source is null or exists(select 1 from private.suspensions where user_id=p_user) then return; end if;
 insert into private.member_push_queue(user_id,token,kind,source_id,group_key)
 select d.user_id,d.token,p_kind,p_source,p_group from private.member_push_devices d where d.user_id=p_user
 on conflict(user_id,token,kind,group_key) where state='pending' do update set source_id=excluded.source_id;
end; $$;
revoke all on function private.queue_member_push(uuid,text,uuid,text) from public,anon,authenticated;

create function private.member_activity_push_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.is_read then perform private.queue_member_push(new.recipient,'activity',new.id); end if;
 return new;
exception when others then raise warning 'Member activity alert could not be queued'; return new;
end; $$;
revoke all on function private.member_activity_push_trigger() from public,anon,authenticated;
create trigger member_activity_push after insert on private.activity_notices for each row execute function private.member_activity_push_trigger();

create function private.member_message_push_trigger() returns trigger language plpgsql security definer set search_path='' as $$
declare target_user uuid;
begin
 select case when l.sender=new.sender then l.recipient else l.sender end into target_user
 from private.friend_links l where l.id=new.link_id and l.status='accepted' and new.sender in(l.sender,l.recipient);
 if target_user is not null then perform private.queue_member_push(target_user,'message',new.id); end if;
 return new;
exception when others then raise warning 'Member message alert could not be queued'; return new;
end; $$;
revoke all on function private.member_message_push_trigger() from public,anon,authenticated;
create trigger member_message_push after insert on private.friend_messages for each row execute function private.member_message_push_trigger();

create function private.member_friendship_push_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='pending' and (tg_op='INSERT' or old.status is distinct from new.status) then
  perform private.queue_member_push(new.recipient,'friendship',new.id);
 elsif tg_op='UPDATE' and new.status='accepted' and old.status is distinct from new.status then
  perform private.queue_member_push(new.sender,'friendship',new.id);
 end if;
 return new;
exception when others then raise warning 'Member friendship alert could not be queued'; return new;
end; $$;
revoke all on function private.member_friendship_push_trigger() from public,anon,authenticated;
create trigger member_friendship_push after insert or update of status on private.friend_links for each row execute function private.member_friendship_push_trigger();

create function private.member_testimony_comment_push_trigger() returns trigger language plpgsql security definer set search_path='' as $$
declare target_user uuid;
begin
 if new.status<>'approved' or (tg_op='UPDATE' and old.status='approved') then return new; end if;
 if new.item_id !~ '^testimony-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return new; end if;
 select t.author into target_user from private.testimonies t
 join public.content_items i on i.id=new.item_id and i.published
 where t.id=substring(new.item_id from 11)::uuid and t.status='published' and t.author<>new.user_id;
 if target_user is not null then perform private.queue_member_push(target_user,'testimony_comment',new.id,new.item_id); end if;
 return new;
exception when others then raise warning 'Testimony reply alert could not be queued'; return new;
end; $$;
revoke all on function private.member_testimony_comment_push_trigger() from public,anon,authenticated;
create trigger member_testimony_comment_push after insert or update of status on public.comments for each row execute function private.member_testimony_comment_push_trigger();

create function private.member_prayer_push_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.is_read and (tg_op='INSERT' or new.created_at is distinct from old.created_at) then
  perform private.queue_member_push(new.user_id,'prayer',new.id);
 end if;
 return new;
exception when others then raise warning 'Member prayer alert could not be queued'; return new;
end; $$;
revoke all on function private.member_prayer_push_trigger() from public,anon,authenticated;
create trigger member_prayer_push after insert or update of created_at on private.prayer_notices for each row execute function private.member_prayer_push_trigger();

create function private.member_gathering_push_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.is_read then perform private.queue_member_push(new.user_id,'gathering',new.id); end if;
 return new;
exception when others then raise warning 'Member gathering alert could not be queued'; return new;
end; $$;
revoke all on function private.member_gathering_push_trigger() from public,anon,authenticated;
create trigger member_gathering_push after insert on private.gathering_notices for each row execute function private.member_gathering_push_trigger();

-- Recheck unread state, membership and blocks just before dispatch.
create function private.member_push_still_relevant(p_user uuid,p_kind text,p_source uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
 if exists(select 1 from private.suspensions where user_id=p_user) then return false; end if;
 case p_kind
 when 'activity' then return exists(
  select 1 from private.activity_notices n where n.id=p_source and n.recipient=p_user and not n.is_read
   and (n.actor is null or (not exists(select 1 from private.suspensions s where s.user_id=n.actor)
    and not exists(select 1 from public.blocks b where (b.user_id=p_user and b.blocked_user_id=n.actor) or (b.user_id=n.actor and b.blocked_user_id=p_user))))
   and ((n.kind='discussion_reply' and exists(select 1 from public.community_posts p where p.id::text=n.target and p.status='approved') and exists(select 1 from public.community_posts p where p.id::text=n.source and p.status='approved')
     and not exists(select 1 from public.community_reports r where r.reporter=p_user and not r.resolved and r.post_id::text in (n.target,n.source))
     and not exists(select 1 from public.community_posts p join public.blocks b on b.user_id=p_user and b.blocked_user_id=p.author where p.id::text in (n.target,n.source)))
    or (n.kind='confession_reply' and exists(select 1 from public.confessions c where c.id=n.target and c.author=p_user and c.closed=0)
     and exists(select 1 from public.confessions c where c.id=n.source and c.status='approved')
     and not exists(select 1 from public.confession_blocks b where (b.actor=p_user and b.target=n.actor) or (b.actor=n.actor and b.target=p_user)))));
 when 'message' then return exists(
  select 1 from private.friend_messages m join private.friend_links l on l.id=m.link_id
  left join private.friend_reads r on r.link_id=l.id and r.user_id=p_user
  where m.id=p_source and m.sender<>p_user and p_user in(l.sender,l.recipient) and l.status='accepted'
   and (r.seen_at is null or (m.created_at,m.id)>(r.seen_at,r.seen_id))
   and not exists(select 1 from private.friend_blocks b where (b.actor=l.sender and b.target=l.recipient) or (b.actor=l.recipient and b.target=l.sender))
   and not exists(select 1 from private.suspensions s where s.user_id=m.sender));
 when 'friendship' then return exists(
  select 1 from private.friend_links l where l.id=p_source
   and ((l.status='pending' and l.recipient=p_user) or (l.status='accepted' and l.sender=p_user))
   and not exists(select 1 from private.friend_blocks b where (b.actor=l.sender and b.target=l.recipient) or (b.actor=l.recipient and b.target=l.sender))
   and not exists(select 1 from private.suspensions s where s.user_id=case when l.sender=p_user then l.recipient else l.sender end));
 when 'testimony_comment' then return exists(
  select 1 from public.comments c join private.testimonies t on c.item_id='testimony-'||t.id::text
  join public.content_items i on i.id=c.item_id and i.published
  where c.id=p_source and c.status='approved' and t.status='published' and t.author=p_user and c.user_id<>p_user
   and not exists(select 1 from private.suspensions s where s.user_id=c.user_id)
   and not exists(select 1 from public.blocks b where (b.user_id=p_user and b.blocked_user_id=c.user_id) or (b.user_id=c.user_id and b.blocked_user_id=p_user))
   and not exists(select 1 from public.reports r where r.reporter_id=p_user and r.status='open' and (r.comment_id=c.id or r.item_id=c.item_id)));
 when 'prayer' then return exists(
  select 1 from private.prayer_notices n join private.prayer_requests r on r.id=n.request_id
  where n.id=p_source and n.user_id=p_user and not n.is_read and r.status='approved' and r.starts_at>now()-interval '7 days'
   and not exists(select 1 from private.prayer_reports x where x.request_id=r.id and x.user_id=p_user));
 when 'gathering' then return exists(
  select 1 from private.gathering_notices n join public.gatherings g on g.id=n.gathering_id
  where n.id=p_source and n.user_id=p_user and not n.is_read and n.starts_at=g.starts_at and g.status='published' and g.ends_at>now()
   and (g.host_id=p_user or exists(select 1 from public.memberships m where m.gathering_id=g.id and m.user_id=p_user))
   and not exists(select 1 from private.gathering_bans b where b.gathering_id=g.id and b.user_id=p_user));
 else return false; end case;
end; $$;
revoke all on function private.member_push_still_relevant(uuid,text,uuid) from public,anon,authenticated;

-- Process Expo tickets and receipts separately: accepting a request is not
-- evidence that Apple delivered it. No personal content is sent to Expo.
create function private.dispatch_member_pushes() returns void language plpgsql security definer set search_path='' as $$
declare j private.member_push_queue; r record; payload jsonb; ticket jsonb; expo_key text; headers jsonb; lang text; message text; destination jsonb; item_key text;
begin
 delete from private.member_push_queue where created_at<now()-interval '30 days' and state in ('sent','cancelled','failed');
 select decrypted_secret into expo_key from vault.decrypted_secrets where name='expo_push_access_token' limit 1;
 headers:=jsonb_build_object('Content-Type','application/json');
 if expo_key is not null and expo_key<>'' then headers:=headers||jsonb_build_object('Authorization','Bearer '||expo_key); end if;
 for j in select * from private.member_push_queue where state='sending' for update skip locked limit 100 loop
  select status_code,content,timed_out,error_msg into r from net._http_response where id=j.request_id;
  if found then
   if r.status_code=200 and not r.timed_out and r.error_msg is null then
    begin payload:=r.content::jsonb; ticket:=payload->'data'; exception when others then ticket:=null; end;
    if ticket->>'status'='ok' and ticket->>'id' is not null then
     update private.member_push_queue set state='ticketed',ticket_id=ticket->>'id',due_at=now()+interval '15 minutes' where id=j.id;
    elsif ticket->'details'->>'error'='DeviceNotRegistered' then
     delete from private.member_push_devices where user_id=j.user_id and token=j.token;
    else update private.member_push_queue set state=case when attempts<3 then 'retry' else 'failed' end,due_at=now()+interval '2 minutes' where id=j.id; end if;
   else update private.member_push_queue set state=case when attempts<3 then 'retry' else 'failed' end,due_at=now()+interval '2 minutes' where id=j.id; end if;
  elsif j.due_at<now()-interval '5 minutes' then
   update private.member_push_queue set state=case when attempts<3 then 'retry' else 'failed' end,due_at=now()+interval '2 minutes' where id=j.id;
  end if;
 end loop;
 for j in select * from private.member_push_queue where state='ticketed' and due_at<=now() for update skip locked limit 100 loop
  if j.receipt_request_id is null then
   update private.member_push_queue set receipt_request_id=net.http_post(
    url:='https://exp.host/--/api/v2/push/getReceipts',headers:=headers,
    body:=jsonb_build_object('ids',jsonb_build_array(j.ticket_id))
   ),due_at=now()+interval '1 minute' where id=j.id;
  else
   select status_code,content,timed_out,error_msg into r from net._http_response where id=j.receipt_request_id;
   if found and r.status_code=200 and not r.timed_out and r.error_msg is null then
    begin payload:=r.content::jsonb; ticket:=payload->'data'->j.ticket_id; exception when others then ticket:=null; end;
    if ticket->>'status'='ok' then update private.member_push_queue set state='sent' where id=j.id;
    elsif ticket->'details'->>'error'='DeviceNotRegistered' then delete from private.member_push_devices where user_id=j.user_id and token=j.token;
    elsif ticket->>'status'='error' then update private.member_push_queue set state='failed' where id=j.id;
    elsif j.created_at<now()-interval '23 hours' then update private.member_push_queue set state='failed' where id=j.id;
    else update private.member_push_queue set receipt_request_id=null,due_at=now()+interval '5 minutes' where id=j.id; end if;
   elsif j.created_at<now()-interval '23 hours' then update private.member_push_queue set state='failed' where id=j.id;
   else update private.member_push_queue set receipt_request_id=null,due_at=now()+interval '5 minutes' where id=j.id; end if;
  end if;
 end loop;
 for j in select * from private.member_push_queue where state in ('pending','retry') and due_at<=now() order by due_at for update skip locked limit 50 loop
  if not private.member_push_still_relevant(j.user_id,j.kind,j.source_id) then
   update private.member_push_queue set state='cancelled' where id=j.id; continue;
  end if;
  select language into lang from private.member_push_devices where user_id=j.user_id and token=j.token;
  if lang is null then update private.member_push_queue set state='cancelled' where id=j.id; continue; end if;
  message:=case lang when 'pt' then 'Você tem uma nova atividade no Grace & Gather.'
   when 'es' then 'Tienes nueva actividad en Grace & Gather.'
   when 'ru' then 'В Grace & Gather есть новое событие.'
   else 'You have new activity in Grace & Gather.' end;
  destination:=jsonb_build_object('screen',case when j.kind='friendship' then 'friends' else 'notifications' end);
  if j.kind='testimony_comment' then
   select item_id into item_key from public.comments where id=j.source_id;
   destination:=jsonb_build_object('screen','story','id',item_key);
  end if;
  begin
   update private.member_push_queue set state='sending',attempts=attempts+1,due_at=now(),request_id=net.http_post(
    url:='https://exp.host/--/api/v2/push/send',headers:=headers,
    body:=jsonb_build_object('to',j.token,'title','Grace & Gather','body',message,'sound','default','data',destination)
   ) where id=j.id;
  exception when others then
   update private.member_push_queue set attempts=attempts+1,state=case when attempts+1<3 then 'retry' else 'failed' end,due_at=now()+interval '2 minutes' where id=j.id;
  end;
 end loop;
end; $$;
revoke all on function private.dispatch_member_pushes() from public,anon,authenticated;
select cron.schedule('grace-member-push','* * * * *','select private.dispatch_member_pushes()');
