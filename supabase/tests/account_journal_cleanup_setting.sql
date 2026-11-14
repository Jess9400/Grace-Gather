begin;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
 if public.journal_cleanup_enabled() then raise exception 'cleanup should default off'; end if;
 begin
   perform public.set_journal_cleanup_enabled(true,'00000000-0000-0000-0000-000000000002');
   raise exception 'wrong account accepted';
 exception when raise_exception then if sqlerrm <> 'not_allowed' then raise; end if; end;
 perform public.set_journal_cleanup_enabled(true,'00000000-0000-0000-0000-000000000001');
 if not public.journal_cleanup_enabled() then raise exception 'choice not saved'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
 if public.journal_cleanup_enabled() then raise exception 'other account inherited cleanup'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.set_journal_cleanup_enabled(false,'00000000-0000-0000-0000-000000000001');
do $$ begin if public.journal_cleanup_enabled() then raise exception 'choice not revoked'; end if; end $$;
rollback;
