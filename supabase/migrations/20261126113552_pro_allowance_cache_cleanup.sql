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
-- Fail deployment rather than silently promise a scheduled deletion without a scheduler.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('grace-pro-cache-cleanup','7 * * * *',
 $job$select private.cleanup_pro_allowance_cache();
 delete from cron.job_run_details where jobid=(select jobid from cron.job where jobname='grace-pro-cache-cleanup')
 and end_time<now()-interval '7 days';$job$);
