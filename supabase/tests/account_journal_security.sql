-- Run against an isolated database with the account-journal migration applied.
begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.is_anonymous', 'false', true);
insert into public.account_journals (user_id, entries) values
  ('00000000-0000-0000-0000-000000000001', '[{"id":"a"}]');
insert into storage.objects (bucket_id, name) values
  ('account-journal-audio', '00000000-0000-0000-0000-000000000001/recording.bin');

do $$
declare n integer;
begin
  begin
    insert into public.account_journals (user_id) values ('00000000-0000-0000-0000-000000000002');
    raise exception 'Another account was able to insert a journal';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.account_journals set user_id = '00000000-0000-0000-0000-000000000002';
    raise exception 'Journal owner could be reassigned';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  select count(*) into n from public.account_journals;
  if n <> 0 then raise exception 'Another account could read a journal'; end if;
  select count(*) into n from storage.objects where bucket_id = 'account-journal-audio';
  if n <> 0 then raise exception 'Another account could read a recording'; end if;
  begin
    insert into storage.objects (bucket_id, name) values
      ('account-journal-audio', '00000000-0000-0000-0000-000000000001/other.bin');
    raise exception 'Another account could upload a recording';
  exception when insufficient_privilege then null;
  end;
  update public.account_journals set entries = '[]';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Another account could update a journal'; end if;
  delete from public.account_journals;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Another account could delete a journal'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  perform set_config('request.jwt.claim.is_anonymous', 'true', true);
  select count(*) into n from public.account_journals;
  if n <> 0 then raise exception 'Anonymous session could read a journal'; end if;
  update public.account_journals set entries = '[]';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Anonymous session could change a journal'; end if;
  select count(*) into n from storage.objects where bucket_id = 'account-journal-audio';
  if n <> 0 then raise exception 'Anonymous session could read a recording'; end if;
end $$;
rollback;
