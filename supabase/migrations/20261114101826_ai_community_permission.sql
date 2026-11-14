-- Members choose whether their community posts and messages may be sent to
-- the external AI service for translation and automated safety screening.
create table private.ai_community_permission (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allowed boolean not null default false,
  community_version text,
  journal_allowed boolean not null default false,
  journal_version text,
  updated_at timestamptz not null default now()
);
alter table private.ai_community_permission enable row level security;
revoke all on private.ai_community_permission from public, anon, authenticated;

create function public.ai_community_permission() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select allowed and community_version='community-ai-2026-11-14' from private.ai_community_permission where user_id = auth.uid()), false);
$$;
create function public.set_ai_community_permission(p_allowed boolean,p_expected_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_expected_user or not private.can_participate() or p_allowed is null then raise exception 'not_allowed'; end if;
  insert into private.ai_community_permission(user_id,allowed,community_version,updated_at) values(auth.uid(),p_allowed,'community-ai-2026-11-14',now())
  on conflict(user_id) do update set allowed=excluded.allowed,community_version=excluded.community_version,updated_at=excluded.updated_at;
end $$;
revoke all on function public.ai_community_permission(),public.set_ai_community_permission(boolean,uuid) from public,anon;
grant execute on function public.ai_community_permission(),public.set_ai_community_permission(boolean,uuid) to authenticated;

-- Only trusted server functions can check someone else's choice.
create function public.ai_community_permission_for(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select allowed and community_version='community-ai-2026-11-14' from private.ai_community_permission where user_id=p_user),false);
$$;
revoke all on function public.ai_community_permission_for(uuid) from public,anon,authenticated;
grant execute on function public.ai_community_permission_for(uuid) to service_role;

create function public.ai_journal_permission() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select journal_allowed and journal_version='qwen-journal-explicit-2026-11-14' from private.ai_community_permission where user_id=auth.uid()),false);
$$;
create function public.set_ai_journal_permission(p_allowed boolean,p_expected_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_expected_user or not private.can_participate() or p_allowed is null then raise exception 'not_allowed'; end if;
  insert into private.ai_community_permission(user_id,journal_allowed,journal_version,updated_at) values(auth.uid(),p_allowed,'qwen-journal-explicit-2026-11-14',now())
  on conflict(user_id) do update set journal_allowed=excluded.journal_allowed,journal_version=excluded.journal_version,updated_at=excluded.updated_at;
end $$;
revoke all on function public.ai_journal_permission(),public.set_ai_journal_permission(boolean,uuid) from public,anon;
grant execute on function public.ai_journal_permission(),public.set_ai_journal_permission(boolean,uuid) to authenticated;

-- Resolve known message IDs on the server, not arbitrary text supplied by a
-- caller. Both the reader and each original author must have opted in.
create function public.ai_translation_sources(p_items jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid(); item jsonb; source text; v_item_id uuid; value text; results jsonb := '[]'::jsonb;
begin
  if u is null or not private.can_participate() or not public.ai_community_permission() then return results; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 12 or octet_length(p_items::text) > 6000 then raise exception 'invalid_input'; end if;
  for item in select * from jsonb_array_elements(p_items) loop
    source := item->>'source';
    if coalesce(item->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then continue; end if;
    v_item_id := (item->>'id')::uuid;
    value := null;
    if source in ('community_title','community_body') then
      select case when source='community_title' then p.title else p.body end into value
      from public.community_posts p join private.ai_community_permission a on a.user_id=p.author and a.allowed and a.community_version='community-ai-2026-11-14'
      where p.id=v_item_id and p.status='approved' and private.community_readable(p.id);
    elsif source='comment' then
      select c.body into value from public.comments c
      join public.content_items ci on ci.id=c.item_id and ci.published
      join private.ai_community_permission a on a.user_id=c.user_id and a.allowed and a.community_version='community-ai-2026-11-14'
      where c.id=v_item_id and c.status='approved'
        and not exists(select 1 from public.blocks b where b.user_id=u and b.blocked_user_id=c.user_id)
        and not exists(select 1 from private.suspensions s where s.user_id=c.user_id);
    elsif source='friend_message' then
      select m.body into value from private.friend_messages m
      join private.friend_links l on l.id=m.link_id and l.status='accepted'
      join private.ai_community_permission a on a.user_id=m.sender and a.allowed and a.community_version='community-ai-2026-11-14'
      where m.id=v_item_id and u in(l.sender,l.recipient)
        and not exists(select 1 from private.friend_blocks b where (b.actor=l.sender and b.target=l.recipient) or (b.actor=l.recipient and b.target=l.sender))
        and not exists(select 1 from public.blocks b where (b.user_id=l.sender and b.blocked_user_id=l.recipient) or (b.user_id=l.recipient and b.blocked_user_id=l.sender))
        and not exists(select 1 from private.suspensions s where s.user_id in(l.sender,l.recipient));
    end if;
    if value is not null and char_length(trim(value)) between 1 and 2000 then
      results := results || jsonb_build_array(jsonb_build_object('id',v_item_id,'source',source,'text',value));
    end if;
  end loop;
  return results;
end $$;
revoke all on function public.ai_translation_sources(jsonb) from public,anon;
grant execute on function public.ai_translation_sources(jsonb) to authenticated;
