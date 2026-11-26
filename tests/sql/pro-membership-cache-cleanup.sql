-- Run only on the disposable database after loading the cleanup function.
begin;
do $$begin
 if current_database() not like 'gg_membership%' then raise exception 'local database only'; end if;
end;$$;
insert into auth.users(id) values('20000000-0000-4000-8000-000000000001');
do $$
declare u uuid:='20000000-0000-4000-8000-000000000001'; d date:=(clock_timestamp() at time zone 'UTC')::date; n integer;
begin
 insert into private.journal_allowance_requests(user_id,kind,request_key,day,state,result) values
 (u,'entry',repeat('1',64),d-1,'complete','{"reply":"expired journal fixture"}'),
 (u,'followup',repeat('2',64),d-1,'failed',null),
 (u,'study',repeat('3',64),date_trunc('month',d)::date-1,'complete','{"reply":"expired study fixture"}'),
 (u,'entry',repeat('4',64),d,'complete','{"reply":"current journal fixture"}'),
 (u,'study',repeat('5',64),date_trunc('month',d)::date,'complete','{"reply":"current study fixture"}');
 n:=private.cleanup_pro_allowance_cache();
 -- Other fixture accounts may also have expired rows; scope our assertions to this owner.
 if exists(select 1 from private.journal_allowance_requests where user_id=u and request_key in(repeat('1',64),repeat('2',64),repeat('3',64))) then raise exception 'expired retained'; end if;
 if (select count(*) from private.journal_allowance_requests where user_id=u)<>2 then raise exception 'current allowance lost'; end if;
 if (select count(*) from private.journal_allowance_requests where user_id=u and result is not null)<>2 then raise exception 'retry cache erased early'; end if;
 if has_function_privilege('authenticated','private.cleanup_pro_allowance_cache()','execute') or has_function_privilege('anon','private.cleanup_pro_allowance_cache()','execute') then raise exception 'public cleanup privilege'; end if;
 perform private.cleanup_pro_allowance_cache();
 if (select count(*) from private.journal_allowance_requests where user_id=u)<>2 then raise exception 'not idempotent'; end if;
 delete from auth.users where id=u;
 if exists(select 1 from private.journal_allowance_requests where user_id=u) then raise exception 'account deletion left cache'; end if;
end;$$;
rollback;
