-- Specific consent is separate from the general community-AI preference.
create table private.confession_ai_consent (
  confession_id text primary key references public.confessions(id) on delete cascade,
  author uuid not null references auth.users(id) on delete cascade,
  audio_allowed boolean not null default false,
  version text not null check(version='confession-ai-2026-11-16'),
  created_at timestamptz not null default now()
);
alter table private.confession_ai_consent enable row level security;
revoke all on private.confession_ai_consent from public,anon,authenticated;

create function public.confession_record_ai_consent(p_id text,p_author uuid,p_audio_allowed boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_audio_allowed is null or not public.ai_community_permission_for(p_author) then return false; end if;
  insert into private.confession_ai_consent(confession_id,author,audio_allowed,version)
    select c.id,c.author,p_audio_allowed,'confession-ai-2026-11-16'
    from public.confessions c where c.id=p_id and c.author=p_author and c.status='pending'
      and (c.audio_type is null or p_audio_allowed)
    on conflict(confession_id) do nothing;
  return found;
end $$;
revoke all on function public.confession_record_ai_consent(text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.confession_record_ai_consent(text,uuid,boolean) to service_role;

-- Automated screening can approve only the same still-pending submission.
-- The caller is a trusted server function, never a member's client.
create function public.confession_auto_approve(
  p_id text, p_author uuid, p_created bigint, p_audio_reviewed boolean,
  p_body text, p_language text, p_audio_type text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare c public.confessions;
begin
  select * into c from public.confessions where id = p_id for update;
  if not found or c.author is distinct from p_author or c.created is distinct from p_created
     or c.body is distinct from p_body or c.language is distinct from p_language
     or c.audio_type is distinct from p_audio_type
     or c.status <> 'pending' or c.closed <> 0
     or not public.ai_community_permission_for(c.author)
     or not exists(select 1 from private.confession_ai_consent a where a.confession_id=c.id and a.author=c.author and (c.audio_type is null or a.audio_allowed))
     or (c.audio_type is not null and p_audio_reviewed is distinct from true)
     or exists (select 1 from private.suspensions s where s.user_id = c.author)
  then return false; end if;
  -- Preserve the existing priority rules even when the model disagrees.
  if exists (
    select 1 from jsonb_array_elements_text(c.signals::jsonb) signal
    where signal <> 'audio_review'
  ) then return false; end if;
  update public.confessions set status = 'approved' where id = c.id;
  insert into public.confession_audit(id,actor,action,target,note,created)
  values(gen_random_uuid()::text,null,'auto_approved',c.id,
    case when c.audio_type is null then 'Automated safety screening' else 'Automated safety screening with audio transcription consent' end,
    floor(extract(epoch from clock_timestamp())*1000)::bigint);
  return true;
end $$;
revoke all on function public.confession_auto_approve(text,uuid,bigint,boolean,text,text,text) from public,anon,authenticated;
grant execute on function public.confession_auto_approve(text,uuid,bigint,boolean,text,text,text) to service_role;
