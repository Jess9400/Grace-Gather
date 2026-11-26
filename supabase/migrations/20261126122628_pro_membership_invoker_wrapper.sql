-- Keep privileged implementation outside the exposed Data API schema.
-- The private implementation checks auth.uid() and returns only that member's status.
alter function public.membership_status() set schema private;
revoke all on function private.membership_status() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.membership_status() to authenticated;
create function public.membership_status() returns jsonb
language sql security invoker set search_path='' as $$
 select private.membership_status();
$$;
revoke all on function public.membership_status() from public,anon;
grant execute on function public.membership_status() to authenticated;
