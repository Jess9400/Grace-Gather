-- Only the original author's own, still-pending content can be screened.
-- No cross-user context or unapproved reports are sent to the model.
create function public.text_moderation_candidate(p_kind text, p_id uuid, p_actor uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare payload jsonb;
begin
  if p_actor is null or not public.ai_community_permission_for(p_actor)
     or exists (select 1 from private.suspensions where user_id = p_actor)
  then return null; end if;
  if p_kind = 'testimony' then
    select jsonb_build_object('id',t.id,'kind',p_kind,'title',t.title,'body',t.body,
      'displayName',case when t.anonymous then '' else t.display_name end,
      'tags',t.tags,'language',t.language,'revision',t.revision)
      into payload from private.testimonies t
      where t.id = p_id and t.author = p_actor and t.status = 'pending';
  elsif p_kind = 'comment' then
    select jsonb_build_object('id',c.id,'kind',p_kind,'body',c.body,'displayName',c.alias,
      'item',c.item_id,'created',c.created_at)
      into payload from public.comments c join public.content_items i on i.id=c.item_id and i.published
      where c.id = p_id and c.user_id = p_actor and c.status = 'pending';
  elsif p_kind = 'giving' then
    -- Links and organizations need separate verification by a human. The
    -- model cannot verify charities or guarantee that a destination is safe.
    select jsonb_build_object('id',g.id,'kind',p_kind,'title',g.title,'body',g.body,
      'location',g.location,'website',g.website,'created',g.created_at)
      into payload from public.pay_forward_submissions g
      where g.id = p_id and g.owner_id = p_actor and g.status = 'pending' and g.website = '';
  end if;
  return payload;
end $$;
revoke all on function public.text_moderation_candidate(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.text_moderation_candidate(text,uuid,uuid) to service_role;

create function public.text_moderation_approve(p_kind text, p_id uuid, p_actor uuid, p_snapshot jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare t private.testimonies; current_payload jsonb; public_name text;
begin
  -- Lock before rechecking status, permission, and the exact submitted text.
  if p_kind='testimony' then perform 1 from private.testimonies where id=p_id for update;
  elsif p_kind='comment' then perform 1 from public.comments where id=p_id for update;
  elsif p_kind='giving' then perform 1 from public.pay_forward_submissions where id=p_id for update;
  else return false; end if;
  if not found then return false; end if;
  current_payload := public.text_moderation_candidate(p_kind,p_id,p_actor);
  if current_payload is null or current_payload is distinct from p_snapshot then return false; end if;
  if p_kind='testimony' then
    update private.testimonies set status='published',rejection_reason='',published_at=coalesce(published_at,now()),updated_at=now() where id=p_id returning * into t;
    public_name := case when t.anonymous then 'Anonymous member' else t.display_name end;
    insert into public.content_items(id,kind,data,published,sort_at)
      values('testimony-'||t.id,'feed',jsonb_build_object('id','testimony-'||t.id,'type','testimonies','origin','community','title',jsonb_build_object(t.language,t.title),'body',jsonb_build_object(t.language,t.body),'summary',jsonb_build_object(t.language,t.body),'tags',t.tags,'source',public_name,'anonymous',t.anonymous,'lang',t.language,'publishedAt',t.published_at,'updatedAt',t.updated_at),true,t.published_at)
      on conflict(id) do update set data=excluded.data,published=true,sort_at=excluded.sort_at,updated_at=now();
    insert into private.testimony_audit(testimony,actor,action,revision) values(t.id,null,'auto_publish',t.revision);
  elsif p_kind='comment' then
    update public.comments set status='approved' where id=p_id;
  elsif p_kind='giving' then
    update public.pay_forward_submissions set status='approved',reason='' where id=p_id;
  end if;
  return true;
end $$;
revoke all on function public.text_moderation_approve(text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.text_moderation_approve(text,uuid,uuid,jsonb) to service_role;
