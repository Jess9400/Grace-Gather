-- Moderators opt in per device. Push payloads never include private content.
create table private.moderator_devices (
 user_id uuid not null references auth.users(id) on delete cascade,
 token text not null check(token ~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$' and length(token)<300),
 updated_at timestamptz not null default now(), primary key(user_id,token)
);
alter table private.moderator_devices enable row level security;
revoke all on private.moderator_devices from public,anon,authenticated;

create function private.moderator_push_device(p_token text,p_enable boolean) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'not_allowed'; end if;
 if p_token is null or p_token !~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$' or length(p_token)>=300 then raise exception 'invalid_token'; end if;
 if p_enable then
  if not private.is_staff() or not private.can_participate() then raise exception 'not_allowed'; end if;
  insert into private.moderator_devices(user_id,token) values(u,p_token)
  on conflict(user_id,token) do update set updated_at=now();
 else delete from private.moderator_devices where user_id=u and token=p_token;
 end if;
end; $$;
revoke all on function private.moderator_push_device(text,boolean) from public,anon;
grant execute on function private.moderator_push_device(text,boolean) to authenticated;
create function public.moderator_push_device(p_token text,p_enable boolean) returns void language sql security invoker set search_path='' as $$ select private.moderator_push_device(p_token,p_enable) $$;
revoke all on function public.moderator_push_device(text,boolean) from public,anon;
grant execute on function public.moderator_push_device(text,boolean) to authenticated;
create function private.moderator_push_enabled(p_token text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.is_staff() and exists(select 1 from private.moderator_devices where user_id=auth.uid() and token=p_token);
$$;
revoke all on function private.moderator_push_enabled(text) from public,anon;
grant execute on function private.moderator_push_enabled(text) to authenticated;
create function public.moderator_push_enabled(p_token text) returns boolean language sql stable security invoker set search_path='' as $$ select private.moderator_push_enabled(p_token) $$;
revoke all on function public.moderator_push_enabled(text) from public,anon;
grant execute on function public.moderator_push_enabled(text) to authenticated;

create table private.moderator_push_queue (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, token text not null,
 category text not null, source_id text not null,
 created_at timestamptz not null default now(), due_at timestamptz not null default now()+interval '1 minute',
 state text not null default 'pending' check(state in ('pending','sending','ticketed','sent','cancelled','failed')),
 attempts integer not null default 0, request_id bigint, ticket_id text, receipt_request_id bigint,
 foreign key(user_id,token) references private.moderator_devices(user_id,token) on delete cascade
);
alter table private.moderator_push_queue enable row level security;
revoke all on private.moderator_push_queue from public,anon,authenticated;
create index moderator_push_due on private.moderator_push_queue(state,due_at);

create function private.queue_moderator_push() returns trigger language plpgsql security definer set search_path='' as $$
declare n jsonb:=to_jsonb(new); o jsonb; category text:=tg_argv[0]; source text;
begin
 if tg_op='UPDATE' then
  o:=to_jsonb(old);
  if n->>'status'=o->>'status' then return new; end if;
 end if;
 if category in ('confession','discussion','testimony','prayer','comment','giving') and n->>'status' not in ('pending','reported') then return new; end if;
 if category='report' and coalesce(n->>'status','open')<>'open' then return new; end if;
 source:=coalesce(n->>'id',n->>'request_id');
 insert into private.moderator_push_queue(user_id,token,category,source_id)
 select d.user_id,d.token,category,source from private.moderator_devices d
 join private.staff s on s.user_id=d.user_id
 where not exists(select 1 from private.suspensions x where x.user_id=d.user_id);
 return new;
end; $$;
revoke all on function private.queue_moderator_push() from public,anon,authenticated;
create trigger push_confession_review after insert or update of status on public.confessions for each row execute function private.queue_moderator_push('confession');
create trigger push_discussion_review after insert or update of status on public.community_posts for each row execute function private.queue_moderator_push('discussion');
create trigger push_testimony_review after insert or update of status on private.testimonies for each row execute function private.queue_moderator_push('testimony');
create trigger push_prayer_review after insert or update of status on private.prayer_requests for each row execute function private.queue_moderator_push('prayer');
create trigger push_community_report after insert on public.community_reports for each row execute function private.queue_moderator_push('community_report');
create trigger push_prayer_report after insert on private.prayer_reports for each row execute function private.queue_moderator_push('prayer_report');
create trigger push_content_report after insert on public.reports for each row execute function private.queue_moderator_push('report');
create trigger push_comment_review after insert or update of status on public.comments for each row execute function private.queue_moderator_push('comment');
create trigger push_giving_review after insert or update of status on public.pay_forward_submissions for each row execute function private.queue_moderator_push('giving');

-- Check that the item still needs human review after the bot has had time to act.
create function private.moderation_item_pending(p_category text,p_id text) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 case p_category
 when 'confession' then return exists(select 1 from public.confessions where id=p_id and status in ('pending','reported'));
 when 'discussion' then return exists(select 1 from public.community_posts where id::text=p_id and status='pending');
 when 'testimony' then return exists(select 1 from private.testimonies where id::text=p_id and status='pending');
 when 'prayer' then return exists(select 1 from private.prayer_requests where id::text=p_id and status='pending');
 when 'community_report' then return exists(select 1 from public.community_reports where id::text=p_id and not resolved);
 when 'prayer_report' then return exists(select 1 from private.prayer_reports r join private.prayer_requests p on p.id=r.request_id where r.request_id::text=p_id and p.status='approved');
 when 'report' then return exists(select 1 from public.reports where id::text=p_id and status='open');
 when 'comment' then return exists(select 1 from public.comments where id::text=p_id and status='pending');
 when 'giving' then return exists(select 1 from public.pay_forward_submissions where id::text=p_id and status='pending');
 else return false; end case;
end; $$;
revoke all on function private.moderation_item_pending(text,text) from public,anon,authenticated;

-- Dispatch from a private scheduled function; request results are checked on
-- subsequent runs. Never trust a submitted client's claimed staff role.
create function private.dispatch_moderator_pushes() returns void language plpgsql security definer set search_path='' as $$
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
   body:=jsonb_build_object('to',j.token,'title','Grace & Gather','body','A community item needs your review.','sound','default','data',jsonb_build_object('screen','admin'))
  ) where id=j.id;
 end loop;
end; $$;
revoke all on function private.dispatch_moderator_pushes() from public,anon,authenticated;
select cron.schedule('grace-moderator-push','* * * * *','select private.dispatch_moderator_pushes()');
