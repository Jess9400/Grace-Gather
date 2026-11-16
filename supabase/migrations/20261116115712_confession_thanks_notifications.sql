-- A private, content-free thank-you notification for the person who offered
-- comfort. Existing clients cannot render this new kind, so the old snapshot
-- omits it; updated clients explicitly request v2.
alter table private.activity_notices drop constraint activity_notices_kind_check;
alter table private.activity_notices add constraint activity_notices_kind_check
  check (kind in ('confession_reply', 'discussion_reply', 'confession_thanks'));

create function private.confession_thanks_visible(p_recipient uuid, p_source text, p_actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.confessions reply
    join public.confessions parent on parent.id=reply.parent
    where reply.id=p_source and reply.kind='reply' and reply.author=p_recipient
      and reply.status='approved' and reply.thanked=1 and parent.author=p_actor
      and not exists(select 1 from public.confession_blocks b where
        (b.actor=p_recipient and b.target=p_actor) or
        (b.actor=p_actor and b.target=p_recipient))
      and not exists(select 1 from public.blocks b where
        (b.user_id=p_recipient and b.blocked_user_id=p_actor) or
        (b.user_id=p_actor and b.blocked_user_id=p_recipient))
      and not exists(select 1 from private.suspensions s where s.user_id=p_actor)
  );
$$;
revoke all on function private.confession_thanks_visible(uuid,text,uuid) from public,anon,authenticated;

create function private.notify_confession_thanks() returns trigger
language plpgsql security definer set search_path='' as $$
declare sender uuid;
begin
  if new.kind <> 'reply' or new.status <> 'approved' or old.thanked <> 0 or new.thanked <> 1 then return new; end if;
  select author into sender from public.confessions where id=new.parent;
  if sender is not null and sender <> new.author and private.confession_thanks_visible(new.author,new.id,sender) then
    insert into private.activity_notices(recipient,actor,kind,target,source)
    values(new.author,sender,'confession_thanks',new.id,new.id)
    on conflict do nothing;
  end if;
  return new;
end; $$;
revoke all on function private.notify_confession_thanks() from public,anon,authenticated;
create trigger activity_confession_thanks after update of thanked on public.confessions
for each row execute function private.notify_confession_thanks();

alter function private.activity_snapshot() rename to activity_snapshot_unfiltered;
revoke all on function private.activity_snapshot_unfiltered() from public,anon,authenticated;
create function private.activity_snapshot_for_version(p_v2 boolean) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare base jsonb; visible_items jsonb; unread_count integer;
begin
  base:=private.activity_snapshot_unfiltered();
  select coalesce(jsonb_agg(item order by item->>'created_at' desc),'[]'::jsonb),
         count(*) filter (where not (item->>'is_read')::boolean)
    into visible_items,unread_count
  from jsonb_array_elements(base->'items') item
  where item->>'kind' <> 'confession_thanks' or (
    p_v2 and exists (
      select 1 from private.activity_notices n
      where n.id=(item->>'id')::uuid and n.recipient=auth.uid()
        and private.confession_thanks_visible(n.recipient,n.source,n.actor)
    )
  );
  return jsonb_set(jsonb_set(base,'{items}',visible_items),'{unread}',to_jsonb(unread_count));
end; $$;
revoke all on function private.activity_snapshot_for_version(boolean) from public,anon,authenticated;
create function private.activity_snapshot() returns jsonb language sql stable security definer set search_path='' as $$
  select private.activity_snapshot_for_version(false)
$$;
revoke all on function private.activity_snapshot() from public,anon;
grant execute on function private.activity_snapshot() to authenticated;
create function public.activity_snapshot_v2() returns jsonb language sql stable security definer set search_path='' as $$
  select private.activity_snapshot_for_version(true)
$$;
revoke all on function public.activity_snapshot_v2() from public,anon;
grant execute on function public.activity_snapshot_v2() to authenticated;

-- The existing push queue sends a generic alert, without the confession text.
alter function private.member_push_still_relevant(uuid,text,uuid) rename to member_push_still_relevant_before_thanks;
create function private.member_push_still_relevant(p_user uuid,p_kind text,p_source uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select private.member_push_still_relevant_before_thanks(p_user,p_kind,p_source)
    or (p_kind='activity' and exists (
      select 1 from private.activity_notices n
      where n.id=p_source and n.recipient=p_user and n.kind='confession_thanks' and not n.is_read
        and not exists(select 1 from private.suspensions s where s.user_id=p_user)
        and private.confession_thanks_visible(n.recipient,n.source,n.actor)
    ))
$$;
revoke all on function private.member_push_still_relevant(uuid,text,uuid) from public,anon,authenticated;
