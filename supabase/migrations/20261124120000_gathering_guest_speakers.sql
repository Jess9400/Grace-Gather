-- Guest speakers: people the host invites to speak, who may switch their
-- microphone on whenever they like, in either speaking mode.
-- A guest joins through the host's private speaker link (speaker_token), or
-- the host marks someone as a guest during the gathering.
alter table public.memberships
  add column if not exists guest_speaker boolean not null default false;
alter table public.gatherings
  add column if not exists speaker_token text;
