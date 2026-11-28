-- Friend links: a member shares a private link; whoever opens it and confirms
-- becomes their friend at once, with no search and no need to be findable.
-- The link belongs to the member's public name, and a new link can replace it
-- (the old one then stops working). Blocks, suspensions and the daily limit
-- apply as for friend requests.
alter table private.friend_directory add column if not exists invite_token text unique;

create or replace function private.friend_invite_command(p_action text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid := auth.uid(); owner uuid; owner_name text; tok text; link private.friend_links;
begin
 if u is null or not private.can_participate() or not exists(select 1 from auth.users where id=u and (email_confirmed_at is not null or phone_confirmed_at is not null)) then
  raise exception 'sign_in_required';
 end if;
 if octet_length(coalesce(p_data,'{}')::text)>2000 then raise exception 'invalid_input'; end if;
 if p_action in ('link','reset') then
  -- The person who opens the link sees this name, so one is needed first.
  if not exists(select 1 from private.friend_directory where user_id=u) then raise exception 'name_required'; end if;
  select invite_token into tok from private.friend_directory where user_id=u;
  if tok is null or p_action='reset' then
   tok := replace(gen_random_uuid()::text,'-','');
   update private.friend_directory set invite_token=tok where user_id=u;
  end if;
  return jsonb_build_object('token',tok);
 end if;
 select d.user_id,d.name into owner,owner_name from private.friend_directory d
  where d.invite_token=nullif(trim(coalesce(p_data->>'token','')),'');
 if owner is null or exists(select 1 from private.suspensions where user_id=owner)
  or exists(select 1 from private.friend_blocks where (actor=u and target=owner) or (actor=owner and target=u)) then
  raise exception 'unavailable';
 end if;
 select * into link from private.friend_links
  where least(sender,recipient)=least(u,owner) and greatest(sender,recipient)=greatest(u,owner);
 if p_action='preview' then
  return jsonb_build_object('name',owner_name,'self',owner=u,'friends',coalesce(link.status='accepted',false));
 elsif p_action='accept' then
  if owner=u then raise exception 'invalid_target'; end if;
  if not exists(select 1 from private.friend_directory where user_id=u) then raise exception 'name_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(u,owner)::text||greatest(u,owner)::text,0));
  perform pg_advisory_xact_lock(hashtextextended(u::text,1));
  if link.status='accepted' then return jsonb_build_object('name',owner_name); end if;
  if (select count(*) from private.friend_links where sender=u and updated_at>now()-interval '1 day')>=20 then raise exception 'rate_limited'; end if;
  if link.id is null then
   -- Created as accepted, so nobody gets a "request" alert; the owner is told
   -- that someone used their link.
   insert into private.friend_links(sender,recipient,status) values(u,owner,'accepted') returning * into link;
   begin perform private.queue_member_push(owner,'friendship',link.id);
   exception when others then raise warning 'Friend link alert could not be queued'; end;
  else
   -- The status alert goes to the sender, so the link's owner is the sender here.
   update private.friend_links set sender=owner,recipient=u,status='accepted',updated_at=now() where id=link.id;
  end if;
  return jsonb_build_object('name',owner_name);
 end if;
 raise exception 'invalid_action';
end $$;
revoke all on function private.friend_invite_command(text,jsonb) from public,anon,authenticated;
grant execute on function private.friend_invite_command(text,jsonb) to authenticated;
create or replace function public.friend_invite_command(p_action text, p_data jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$select private.friend_invite_command(p_action,p_data);$$;
revoke all on function public.friend_invite_command(text,jsonb) from public,anon;
grant execute on function public.friend_invite_command(text,jsonb) to authenticated;
