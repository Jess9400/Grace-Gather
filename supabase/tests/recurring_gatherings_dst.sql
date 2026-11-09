begin;
select set_config('test.host',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at) values(current_setting('test.host')::uuid,current_setting('test.host')||'@example.invalid',now());
set local role authenticated;
do $$ declare d jsonb; spec jsonb; blocked boolean:=false;begin
perform set_config('request.jwt.claim.sub',current_setting('test.host'),true);
spec:='{"title":"DST fixture","description":"Synthetic DST fixture session","name":"Fixture","topic":"Prayer","capacity":2,"language":"en","visibility":"public","timezone":"America/New_York","localStart":"2027-03-07T19:00","repeat":"weekly","occurrences":2}';
d:=public.gathering_command('create',spec);
perform set_config('test.series',d->>'series_id',true);
begin perform public.gathering_command('create',spec||'{"localStart":"2027-03-07T02:30"}');exception when others then blocked:=true;end;
if not blocked then raise exception 'Invalid DST time accepted';end if;
end $$;
reset role;
do $$begin
if (select count(*) from public.gatherings where host_id=current_setting('test.host')::uuid)<>2 then raise exception 'Partial failed series retained';end if;
if exists(select 1 from public.gatherings where series_id=current_setting('test.series')::uuid and (starts_at at time zone 'America/New_York')::time<>'19:00'::time) then raise exception 'Local time shifted';end if;
if (select max(starts_at)-min(starts_at) from public.gatherings where series_id=current_setting('test.series')::uuid)<>interval '167 hours' then raise exception 'DST not preserved';end if;
end $$;
select 'PASS: DST preserves local time, nonexistent times rejected atomically' result;
rollback;
