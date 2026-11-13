\set ON_ERROR_STOP on
\ir fixture.sql
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
set role authenticated;
do $$begin
 if has_table_privilege('authenticated','private.member_push_devices','select') or has_table_privilege('authenticated','private.member_push_queue','select') then raise exception 'device data is exposed';end if;
 if has_function_privilege('authenticated','private.dispatch_member_pushes()','execute') then raise exception 'dispatcher is callable by members';end if;
end$$;
select public.member_push_device('ExpoPushToken[test_device]',true,'en');
do $$begin if not public.member_push_enabled('ExpoPushToken[test_device]') then raise exception 'registered device not found';end if;end$$;
reset role;
insert into private.friend_links(id,sender,recipient,status) values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','accepted');
insert into private.friend_links(id,sender,recipient,status) values('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','pending');
do $$begin if not exists(select 1 from private.member_push_queue where kind='friendship' and state='pending') then raise exception 'friend request alert not queued';end if;end$$;
update private.friend_links set status='declined' where id='10000000-0000-0000-0000-000000000002';
update private.member_push_queue set due_at=now()-interval '1 second' where kind='friendship';
select private.dispatch_member_pushes();
do $$begin if not exists(select 1 from private.member_push_queue where kind='friendship' and state='cancelled') then raise exception 'declined request still alerted';end if;end$$;
insert into private.friend_messages(id,link_id,sender,body) values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','private words must never appear');
do $$begin if (select count(*) from private.member_push_queue where kind='message')<>1 then raise exception 'message alert not queued';end if;end$$;
-- A message read before dispatch must not produce an alert.
insert into private.friend_reads select link_id,'00000000-0000-0000-0000-000000000002',created_at,id from private.friend_messages;
update private.member_push_queue set due_at=now()-interval '1 second';
select private.dispatch_member_pushes();
do $$begin if not exists(select 1 from private.member_push_queue where source_id='20000000-0000-0000-0000-000000000001' and state='cancelled') or exists(select 1 from net.requests) then raise exception 'read message produced an alert';end if;end$$;
insert into private.friend_messages(id,link_id,sender,body) values('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','private words must never appear');
update private.member_push_queue set due_at=now()-interval '1 second' where state='pending';
select private.dispatch_member_pushes();
do $$begin
 if (select count(*) from net.requests)<>1 then raise exception 'unread message was not dispatched';end if;
 if (select body::text from net.requests limit 1) like '%private words%' or (select body->'data'->>'screen' from net.requests limit 1)<>'notifications' then raise exception 'push payload is unsafe';end if;
end$$;
insert into net._http_response(id,status_code,content,timed_out) select id,200,'{"data":{"status":"ok","id":"ticket-1"}}',false from net.requests;
select private.dispatch_member_pushes();
do $$begin if not exists(select 1 from private.member_push_queue where state='ticketed') then raise exception 'ticket not stored';end if;end$$;
update private.member_push_queue set due_at=now()-interval '1 second' where state='ticketed';
select private.dispatch_member_pushes();
insert into net._http_response(id,status_code,content,timed_out) select id,200,'{"data":{"ticket-1":{"status":"ok"}}}',false from net.requests where url like '%getReceipts';
update private.member_push_queue set due_at=now()-interval '1 second' where state='ticketed';
select private.dispatch_member_pushes();
do $$begin if not exists(select 1 from private.member_push_queue where state='sent') then raise exception 'receipt not processed';end if;end$$;
-- Blocked users cannot generate a phone alert even if a message is inserted.
insert into private.friend_blocks values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001');
insert into private.friend_messages(id,link_id,sender,body) values('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','blocked');
update private.member_push_queue set due_at=now()-interval '1 second' where state='pending';
select private.dispatch_member_pushes();
do $$begin if not exists(select 1 from private.member_push_queue where source_id='20000000-0000-0000-0000-000000000003' and state='cancelled') then raise exception 'blocked message not cancelled';end if;end$$;
insert into private.prayer_requests(id,status,starts_at) values('30000000-0000-0000-0000-000000000001','approved',now());
insert into private.prayer_notices(id,user_id,request_id,kind) values('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000001','prayed');
do $$begin if not exists(select 1 from private.member_push_queue where kind='prayer' and state='pending') then raise exception 'prayer alert not queued';end if;end$$;
insert into public.community_posts(id,parent,author,status) values
 ('50000000-0000-0000-0000-000000000001',null,'00000000-0000-0000-0000-000000000002','approved'),
 ('50000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','approved');
insert into private.activity_notices(id,recipient,actor,kind,target,source) values
 ('60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','discussion_reply','50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002');
do $$begin if not exists(select 1 from private.member_push_queue where kind='activity' and state='pending') then raise exception 'discussion alert not queued';end if;end$$;
insert into public.community_reports(id,resolved,reporter,post_id) values('70000000-0000-0000-0000-000000000001',false,'00000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002');
update private.member_push_queue set due_at=now()-interval '1 second' where kind='activity';
select private.dispatch_member_pushes();
do $$begin if not exists(select 1 from private.member_push_queue where kind='activity' and state='cancelled') then raise exception 'reported discussion still alerted';end if;end$$;
insert into public.confessions(id,kind,parent,author,status,closed) values
 ('conf-root','confession',null,'00000000-0000-0000-0000-000000000002','approved',0),
 ('conf-reply','reply','conf-root','00000000-0000-0000-0000-000000000001','approved',0);
insert into private.activity_notices(id,recipient,actor,kind,target,source) values
 ('60000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','confession_reply','conf-root','conf-reply');
do $$begin
 if not private.member_push_still_relevant('00000000-0000-0000-0000-000000000002','activity','60000000-0000-0000-0000-000000000002') then raise exception 'approved private reply missing';end if;
end$$;
update public.confessions set closed=1 where id='conf-root';
do $$begin
 if private.member_push_still_relevant('00000000-0000-0000-0000-000000000002','activity','60000000-0000-0000-0000-000000000002') then raise exception 'closed private reply still alerted';end if;
end$$;
insert into public.gatherings(id,host_id,status,starts_at,ends_at) values('80000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','published',now()+interval '1 hour',now()+interval '2 hours');
insert into private.gathering_notices(id,gathering_id,user_id,starts_at) select '90000000-0000-0000-0000-000000000001',id,host_id,starts_at from public.gatherings;
do $$begin if not exists(select 1 from private.member_push_queue where kind='gathering' and state='pending') then raise exception 'gathering alert not queued';end if;end$$;
update public.gatherings set status='cancelled';
update private.member_push_queue set due_at=now()-interval '1 second' where kind='gathering';
select private.dispatch_member_pushes();
do $$begin if not exists(select 1 from private.member_push_queue where kind='gathering' and state='cancelled') then raise exception 'cancelled gathering still alerted';end if;end$$;
insert into private.testimonies(id,status,author) values('a0000000-0000-0000-0000-000000000001','published','00000000-0000-0000-0000-000000000002');
insert into public.content_items values('testimony-a0000000-0000-0000-0000-000000000001',true);
insert into public.comments(id,status,item_id,user_id) values('b0000000-0000-0000-0000-000000000001','pending','testimony-a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001');
do $$begin if exists(select 1 from private.member_push_queue where kind='testimony_comment') then raise exception 'pending testimony comment alerted';end if;end$$;
update public.comments set status='approved' where id='b0000000-0000-0000-0000-000000000001';
do $$begin if not exists(select 1 from private.member_push_queue where kind='testimony_comment' and state='pending') then raise exception 'approved testimony reply not queued';end if;end$$;
update private.member_push_queue set due_at=now()-interval '1 second' where kind='testimony_comment';
select private.dispatch_member_pushes();
do $$begin
 if not exists(select 1 from net.requests where body->'data'->>'screen'='story' and body->'data'->>'id'='testimony-a0000000-0000-0000-0000-000000000001') then raise exception 'testimony alert missing destination';end if;
end$$;
-- Reusing a device on another account removes the old account's queued alerts.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
set role authenticated;
select public.member_push_device('ExpoPushToken[test_device]',true,'pt');
reset role;
do $$begin
 if exists(select 1 from private.member_push_devices where user_id='00000000-0000-0000-0000-000000000002') or exists(select 1 from private.member_push_queue where user_id='00000000-0000-0000-0000-000000000002') then raise exception 'previous account was not detached';end if;
end$$;
set role authenticated;
select public.member_push_device('ExpoPushToken[test_device]',false,'pt');
reset role;
do $$begin if exists(select 1 from private.member_push_devices) then raise exception 'device not removed';end if;end$$;
