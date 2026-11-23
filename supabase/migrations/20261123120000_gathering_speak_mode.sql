-- Who may switch on their microphone in a live gathering.
-- 'invited': only the host and people the host allows (others raise a hand).
-- 'everyone': every admitted participant, unless the host made them a listener.
-- New and existing gatherings start as 'invited'; the host can change it in the room.
alter table public.gatherings
  add column if not exists speak_mode text not null default 'invited'
  check (speak_mode in ('everyone', 'invited'));
