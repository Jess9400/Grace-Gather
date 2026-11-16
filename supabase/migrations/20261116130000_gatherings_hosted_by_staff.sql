-- For the first App Store release, gatherings are hosted by the Grace & Gather
-- team. A member's gathering was a public live voice room published at once,
-- with nobody reviewing its title, description or host name first (App
-- Review guideline 1.2). Members can still find, reserve and join gatherings.
--
-- Only inserts made by a signed-in member are checked; maintenance run by the
-- service role (no auth.uid()) is unaffected. Gatherings created before this
-- change are left as they are.
create function private.gathering_host_is_staff() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is not null
     and not exists (select 1 from private.staff s where s.user_id = (select auth.uid())) then
    raise exception 'hosts_only';
  end if;
  return new;
end;
$$;
revoke all on function private.gathering_host_is_staff() from public, anon, authenticated;
create trigger gatherings_host_is_staff before insert on public.gatherings
  for each row execute function private.gathering_host_is_staff();
