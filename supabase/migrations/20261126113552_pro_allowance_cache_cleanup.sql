-- Expired retry responses must disappear even if a member never opens the app again.
-- Keep the current allowance period intact: removing those rows would replenish usage.
create index journal_allowance_cleanup_day on private.journal_allowance_requests(day,kind);
create function private.cleanup_pro_allowance_cache() returns integer
language plpgsql security definer set search_path='' as $$
declare d date:=(clock_timestamp() at time zone 'UTC')::date; removed integer;
begin
 delete from private.journal_allowance_requests
 where (kind in ('entry','followup') and day<d)
    or (kind='study' and day<date_trunc('month',d)::date);
 get diagnostics removed = row_count;
 return removed;
end;$$;
revoke all on function private.cleanup_pro_allowance_cache() from public,anon,authenticated;
-- Scheduled hourly wherever pg_cron exists (it does on Supabase). Test
-- databases without a scheduler skip only the registration, as in earlier
-- migrations.
do $do$begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule('grace-pro-cache-cleanup','7 * * * *',
   $job$select private.cleanup_pro_allowance_cache();
   delete from cron.job_run_details where jobid=(select jobid from cron.job where jobname='grace-pro-cache-cleanup')
   and end_time<now()-interval '7 days';$job$);
 end if;
end$do$;
