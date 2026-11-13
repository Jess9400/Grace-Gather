\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
set role authenticated;
do $$begin
 if has_table_privilege('authenticated','private.moderator_devices','select') or has_table_privilege('authenticated','private.moderator_push_queue','select') then raise exception 'device data is exposed';end if;
 if has_function_privilege('authenticated','private.dispatch_moderator_pushes()','execute') then raise exception 'dispatcher is callable by members';end if;
 begin perform public.moderator_push_device('ExpoPushToken[not_staff]',true); raise exception 'ordinary member registered';
 exception when raise_exception then if sqlerrm<>'not_allowed' then raise; end if; end;
end$$;
reset role;
insert into private.staff values('00000000-0000-0000-0000-000000000001');
set role authenticated;
select public.moderator_push_device('ExpoPushToken[test_device]',true);
do $$begin if not public.moderator_push_enabled('ExpoPushToken[test_device]') then raise exception 'registered device not found';end if;end$$;
reset role;
insert into public.confessions(id,kind,author,status) values('test','confession','00000000-0000-0000-0000-000000000002','pending');
do $$begin if (select count(*) from private.moderator_push_queue)<>1 then raise exception 'missing moderator job';end if;end$$;
-- A bot approval before delivery must cancel the notification.
update public.confessions set status='approved' where id='test';
update private.moderator_push_queue set due_at=now()-interval '1 second';
select private.dispatch_moderator_pushes();
do $$begin if (select state from private.moderator_push_queue limit 1)<>'cancelled' then raise exception 'approved item sent';end if;end$$;
update public.confessions set status='reported' where id='test';
update private.moderator_push_queue set due_at=now()-interval '1 second' where state='pending';
select private.dispatch_moderator_pushes();
do $$begin
 if (select count(*) from net.requests)<>1 then raise exception 'push not dispatched';end if;
 if (select body->>'body' from net.requests) like '%test%' then raise exception 'private content leaked';end if;
end$$;
insert into net._http_response(id,status_code,content,timed_out) select id,200,'{"data":{"status":"ok","id":"ticket-1"}}',false from net.requests;
select private.dispatch_moderator_pushes();
do $$begin if (select count(*) from private.moderator_push_queue where state='ticketed')<>1 then raise exception 'ticket not stored';end if;end$$;
update private.moderator_push_queue set due_at=now()-interval '1 second' where state='ticketed';
select private.dispatch_moderator_pushes();
insert into net._http_response(id,status_code,content,timed_out) select id,200,'{"data":{"ticket-1":{"status":"ok"}}}',false from net.requests where url like '%getReceipts';
update private.moderator_push_queue set due_at=now()-interval '1 second' where state='ticketed';
select private.dispatch_moderator_pushes();
do $$begin if (select count(*) from private.moderator_push_queue where state='sent')<>1 then raise exception 'receipt not processed';end if;end$$;
set role authenticated;
select public.moderator_push_device('ExpoPushToken[test_device]',false);
reset role;
do $$begin if exists(select 1 from private.moderator_devices) then raise exception 'device not removed';end if;end$$;
