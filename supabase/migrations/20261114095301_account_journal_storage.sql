-- Private journal document for a signed-in member. This migration is not
-- deployed until client sync, migration, and audio handling are complete.
create table public.account_journals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  entries jsonb not null default '[]'::jsonb check (jsonb_typeof(entries) = 'array'),
  updated_at timestamptz not null default now()
);

alter table public.account_journals enable row level security;
revoke all on public.account_journals from public, anon, authenticated;
grant select, insert, update, delete on public.account_journals to authenticated;

create policy account_journal_select on public.account_journals
  for select to authenticated
  using ((select auth.uid()) = user_id and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false');
create policy account_journal_insert on public.account_journals
  for insert to authenticated
  with check ((select auth.uid()) = user_id and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false');
create policy account_journal_update on public.account_journals
  for update to authenticated
  using ((select auth.uid()) = user_id and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false')
  with check ((select auth.uid()) = user_id and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false');
create policy account_journal_delete on public.account_journals
  for delete to authenticated
  using ((select auth.uid()) = user_id and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('account-journal-audio', 'account-journal-audio', false, 52428800, array['application/octet-stream']);

create policy account_journal_audio_select on storage.objects
  for select to authenticated
  using (bucket_id = 'account-journal-audio' and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]+/[A-Za-z0-9-]+\.bin$'
    and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false');
create policy account_journal_audio_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'account-journal-audio' and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]+/[A-Za-z0-9-]+\.bin$'
    and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false');
create policy account_journal_audio_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'account-journal-audio' and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]+/[A-Za-z0-9-]+\.bin$'
    and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false');
