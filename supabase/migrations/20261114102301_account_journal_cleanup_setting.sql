-- Keep this choice with the account: a shared device must never inherit it.
create table private.account_journal_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cleanup_enabled boolean not null default false
);
alter table private.account_journal_settings enable row level security;
revoke all on private.account_journal_settings from public, anon, authenticated;

create function public.journal_cleanup_enabled() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select cleanup_enabled from private.account_journal_settings where user_id = auth.uid()), false);
$$;
create function public.set_journal_cleanup_enabled(p_enabled boolean, p_expected_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_expected_user or not private.can_participate() or p_enabled is null then
    raise exception 'not_allowed';
  end if;
  insert into private.account_journal_settings(user_id, cleanup_enabled) values(auth.uid(), p_enabled)
  on conflict(user_id) do update set cleanup_enabled=excluded.cleanup_enabled;
end $$;
revoke all on function public.journal_cleanup_enabled(), public.set_journal_cleanup_enabled(boolean,uuid) from public,anon;
grant execute on function public.journal_cleanup_enabled(), public.set_journal_cleanup_enabled(boolean,uuid) to authenticated;
