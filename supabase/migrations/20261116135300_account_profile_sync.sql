-- Extra account preferences are visible only through the existing own_profile RLS policy.
-- Journal contents and AI consent are deliberately excluded.
alter table public.profiles add column if not exists profile_state jsonb;
alter table public.profiles add constraint profiles_profile_state_size
  check (profile_state is null or octet_length(profile_state::text) <= 8192);
