-- A weekly series shares one host-issued link across its occurrences.
-- Keep bearer credentials outside the member-readable gathering schedule.
create table public.gathering_speaker_links (
  host_id uuid not null references auth.users(id) on delete cascade,
  scope_kind text not null check (scope_kind in ('series', 'gathering')),
  scope_id uuid not null,
  token uuid not null default gen_random_uuid(),
  primary key (host_id, scope_kind, scope_id)
);

alter table public.gathering_speaker_links enable row level security;
revoke all on public.gathering_speaker_links from public, anon, authenticated, service_role;
grant select, insert on public.gathering_speaker_links to service_role;

-- Prevent older function deployments from publishing new speaker credentials.
alter table public.gatherings add column if not exists speaker_token text;
alter table public.gatherings add constraint gatherings_speaker_token_private
  check (speaker_token is null);
