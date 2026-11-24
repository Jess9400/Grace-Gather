-- Stable peer IDs avoid confusing two friends with the same display name.
create or replace function private.study_notebook(p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); peer_id uuid; v text; r text; b text; needle text; skip integer;
 item private.study_plan_invites; note private.study_notes; result jsonb; plan_number integer;
begin
 if u is null or not exists(select 1 from auth.users where id=u and (email_confirmed_at is not null or phone_confirmed_at is not null)) then raise exception 'sign_in_required'; end if;
 if octet_length(coalesce(p_data,'{}')::text)>85000 then raise exception 'invalid_input'; end if;
 v:=trim(coalesce(p_data->>'verse',''));
 if p_action='stats' then
  return jsonb_build_object('notes',(select count(*) from private.study_notes where user_id=u));
 elsif p_action='notes' then
  needle:=left(trim(coalesce(p_data->>'search','')),200);
  skip:=greatest(0,least(5000,coalesce((p_data->>'offset')::integer,0)));
  select coalesce(jsonb_agg(to_jsonb(n)),'[]') into result from (
   select verse,reference,body,updated_at from private.study_notes where user_id=u
   and (needle='' or strpos(lower(body),lower(needle))>0 or strpos(lower(reference),lower(needle))>0)
   order by updated_at desc,verse limit 50 offset skip
  ) n;
  return result;
 elsif p_action='note' then
  select * into note from private.study_notes where user_id=u and verse=v;
  return case when note.user_id is null then 'null'::jsonb else jsonb_build_object('verse',note.verse,'reference',note.reference,'body',note.body,'updated_at',note.updated_at) end;
 elsif p_action='save' then
  b:=trim(coalesce(p_data->>'body','')); r:=trim(coalesce(p_data->>'reference',''));
  if length(v) not between 1 and 256 or length(r) not between 1 and 200 or length(b) not between 1 and 20000 then raise exception 'invalid_input'; end if;
  insert into private.study_notes(user_id,verse,reference,body) values(u,v,r,b)
  on conflict(user_id,verse) do update set body=excluded.body,reference=excluded.reference,updated_at=now();
  return jsonb_build_object('saved',true);
 elsif p_action='delete' then
  delete from private.study_shared_notes where author=u and verse=v;
  delete from private.study_notes where user_id=u and verse=v;
  return jsonb_build_object('deleted',true);
 end if;
 -- Shared actions have the same suspension and block protections as private chats.
 if not private.can_participate() then raise exception 'forbidden'; end if;
 if p_action='invitations' then
  select coalesce(jsonb_agg(to_jsonb(n)),'[]') into result from (
   select i.id,i.plan,i.status,i.inviter=u as outgoing,case when i.inviter=u then i.invitee else i.inviter end as peer,d.name
   from private.study_plan_invites i
   left join private.friend_directory d on d.user_id=case when i.inviter=u then i.invitee else i.inviter end
   where u in(i.inviter,i.invitee) and i.status in('pending','accepted')
   and not exists(select 1 from private.friend_blocks where (actor=i.inviter and target=i.invitee) or (actor=i.invitee and target=i.inviter))
   and not exists(select 1 from private.suspensions where user_id in(i.inviter,i.invitee))
   order by i.updated_at desc limit 100
  ) n; return result;
 elsif p_action='invite' then
  peer_id:=(p_data->>'peer')::uuid; plan_number:=(p_data->>'plan')::integer;
  if plan_number not between 0 and 14 or peer_id is null or peer_id=u then raise exception 'invalid_target'; end if;
  if exists(select 1 from private.suspensions where user_id=peer_id)
   or exists(select 1 from private.friend_blocks where (actor=u and target=peer_id) or (actor=peer_id and target=u)) then raise exception 'unavailable'; end if;
  -- Invitations go only to existing, accepted friends; an address cannot be enumerated.
  if not exists(select 1 from private.friend_links l where l.status='accepted' and ((l.sender=u and l.recipient=peer_id) or (l.recipient=u and l.sender=peer_id))) then raise exception 'friend_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,82));
  if (select count(*) from private.study_plan_invites where inviter=u and updated_at>now()-interval '1 day')>=20 then raise exception 'rate_limited'; end if;
  insert into private.study_plan_invites(plan,inviter,invitee) values(plan_number,u,peer_id)
  on conflict(plan,(least(inviter,invitee)),(greatest(inviter,invitee))) do nothing;
  select * into item from private.study_plan_invites where plan=plan_number and least(inviter,invitee)=least(u,peer_id) and greatest(inviter,invitee)=greatest(u,peer_id) for update;
  if item.status in('declined','revoked') then
   -- New consent never re-exposes a previous collaboration's shared snapshots.
   delete from private.study_shared_notes where invitation=item.id;
   update private.study_plan_invites set inviter=u,invitee=peer_id,status='pending',updated_at=now() where id=item.id;
  end if;
  return jsonb_build_object('invited',true);
 end if;
 select * into item from private.study_plan_invites where id=(p_data->>'invitation')::uuid and u in(inviter,invitee) for update;
 if item.id is null then raise exception 'unavailable'; end if;
 if exists(select 1 from private.friend_blocks where (actor=item.inviter and target=item.invitee) or (actor=item.invitee and target=item.inviter))
  or exists(select 1 from private.suspensions where user_id in(item.inviter,item.invitee)) then raise exception 'unavailable'; end if;
 if p_action='respond' then
  if item.invitee<>u or item.status<>'pending' then raise exception 'forbidden'; end if;
  if p_data->>'response' not in('accepted','declined') then raise exception 'invalid_input'; end if;
  update private.study_plan_invites set status=p_data->>'response',updated_at=now() where id=item.id;
  return jsonb_build_object('updated',true);
 elsif p_action='leave' then
  update private.study_plan_invites set status='revoked',updated_at=now() where id=item.id;
  delete from private.study_shared_notes where invitation=item.id;
  return jsonb_build_object('left',true);
 end if;
 if item.status<>'accepted' then raise exception 'acceptance_required'; end if;
 if p_action='shared' then
  skip:=greatest(0,least(5000,coalesce((p_data->>'offset')::integer,0)));
  select coalesce(jsonb_agg(to_jsonb(n)),'[]') into result from (
   select n.id,n.verse,n.reference,n.body,n.updated_at,n.author=u as mine,d.name
   from private.study_shared_notes n left join private.friend_directory d on d.user_id=n.author
   where n.invitation=item.id order by n.updated_at desc,n.id limit 50 offset skip
  ) n; return result;
 elsif p_action='share' then
  select * into note from private.study_notes where user_id=u and verse=v;
  if note.user_id is null then raise exception 'note_required'; end if;
  insert into private.study_shared_notes(invitation,author,verse,reference,body) values(item.id,u,v,note.reference,note.body)
   on conflict(invitation,author,verse) do update set body=excluded.body,reference=excluded.reference,updated_at=now();
  return jsonb_build_object('shared',true);
 elsif p_action='unshare' then
  delete from private.study_shared_notes where invitation=item.id and author=u and id=(p_data->>'note')::uuid;
  return jsonb_build_object('removed',true);
 end if;
 raise exception 'invalid_action';
end $$;
