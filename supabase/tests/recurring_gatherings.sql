begin;
select set_config('test.host',gen_random_uuid()::text,true),set_config('test.guest',gen_random_uuid()::text,true),set_config('test.other',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at) select current_setting(k)::uuid,current_setting(k)||'@example.invalid',now() from unnest(array['test.host','test.guest','test.other']) k;
set local role authenticated;
do $$
declare d jsonb; spec jsonb; blocked boolean;
begin
perform set_config('request.jwt.claim.sub',current_setting('test.host'),true);
spec:=jsonb_build_object('title','Fixture gathering','description','Synthetic recurring session test','name','Fixture host','topic','Prayer','capacity',2,'language','en','visibility','public','timezone','UTC','localStart',to_char(now() at time zone 'UTC'+interval '23 hours','YYYY-MM-DD"T"HH24:MI'),'repeat','weekly','occurrences',3);
d:=public.gathering_command('create',spec);
perform set_config('test.session',d->>'id',true);
perform set_config('test.series',d->>'series_id',true);
if (d->>'occurrences')::int<>3 then raise exception 'Series count'; end if;
perform set_config('request.jwt.claim.sub',current_setting('test.guest'),true);
perform public.gathering_command('reserve',jsonb_build_object('id',current_setting('test.session')));
perform set_config('request.jwt.claim.sub',current_setting('test.other'),true);
blocked:=false;begin perform public.gathering_command('reserve',jsonb_build_object('id',current_setting('test.session')));exception when others then blocked:=true;end;
if not blocked then raise exception 'Capacity bypass';end if;
blocked:=false;begin perform public.gathering_command('cancel_series',jsonb_build_object('id',current_setting('test.session')));exception when others then blocked:=true;end;
if not blocked then raise exception 'Nonhost cancellation';end if;
end $$;
reset role;
select private.queue_gathering_reminders();
select private.queue_gathering_reminders();
do $$ begin
if (select count(*) from private.gathering_notices where gathering_id=current_setting('test.session')::uuid)<>2 then raise exception 'Host/guest reminders or dedup failed';end if;
if (select count(*) from public.gatherings where series_id=current_setting('test.series')::uuid)<>3 then raise exception 'Missing occurrences';end if;
if (select count(*) from private.gathering_notices n join public.gatherings g on g.id=n.gathering_id where g.series_id=current_setting('test.series')::uuid)<>2 then raise exception 'Early reminder';end if;
end $$;
set local role authenticated;
do $$ declare d jsonb;begin
perform set_config('request.jwt.claim.sub',current_setting('test.other'),true);
if (public.gathering_notifications()->>'unread')::int<>0 then raise exception 'Private reminders exposed';end if;
perform set_config('request.jwt.claim.sub',current_setting('test.guest'),true);
d:=public.gathering_notifications();
if (d->>'unread')::int<>1 then raise exception 'Guest missing reminder';end if;
if (public.gathering_notifications((d->'items'->0->>'id')::uuid)->>'unread')::int<>0 then raise exception 'Mark read failed';end if;
perform public.gathering_command('leave',jsonb_build_object('id',current_setting('test.session')));
if jsonb_array_length(public.gathering_notifications()->'items')<>0 then raise exception 'Withdrawn reminder remains';end if;
perform set_config('request.jwt.claim.sub',current_setting('test.host'),true);
perform public.gathering_command('cancel_series',jsonb_build_object('id',current_setting('test.session')));
if jsonb_array_length(public.gathering_notifications()->'items')<>0 then raise exception 'Cancelled reminder remains';end if;
if has_table_privilege('authenticated','private.gathering_notices','SELECT') then raise exception 'Direct table exposed';end if;
if has_function_privilege('anon','public.gathering_notifications(uuid)','EXECUTE') then raise exception 'Anon exposed';end if;
end $$;
reset role;
select 'PASS: recurrence, capacity, host authorization, reminder timing/dedup, privacy, read state, withdrawal and cancellation' result;
rollback;
