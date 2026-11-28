-- Preserve compatibility and make deletion complete in both old and new stores.
create function private.study_personal_legacy_sync() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.kind='personal' then delete from private.study_notes where user_id=old.user_id and verse=old.verse; end if;
  return old;
 end if;
 if new.kind='personal' then
  insert into private.study_notes(user_id,verse,reference,body,updated_at) values(new.user_id,new.verse,new.reference,new.body,new.updated_at)
  on conflict(user_id,verse) do update set reference=excluded.reference,body=excluded.body,updated_at=excluded.updated_at;
 end if;
 return new;
end; $$;
revoke all on function private.study_personal_legacy_sync() from public,anon,authenticated;
create trigger study_personal_legacy_sync after insert or update or delete on private.study_context_notes for each row execute function private.study_personal_legacy_sync();
