create function private.community_feed(p_before timestamptz default null,p_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; mod boolean:=private.community_moderator();
begin
 if auth.uid() is null then raise exception 'unauthorized';end if;
 if (p_before is null) <> (p_id is null) then raise exception 'invalid_cursor';end if;
 with selected_reports as (
  select * from public.community_reports where reporter=auth.uid() or (mod and not resolved)
  order by case when mod and not resolved then 0 else 1 end,
   case when mod and not resolved then created_at end asc,created_at desc,id limit 100
 ), candidates as materialized (
 select p.* from public.community_posts p where p.parent is null and p.status='approved' and private.community_readable(p.id)
 and not exists(select 1 from public.blocks b where b.user_id=auth.uid() and b.blocked_user_id=p.author)
 and not exists(select 1 from public.community_reports r where r.reporter=auth.uid() and not r.resolved and r.post_id=p.id)
 and not exists(select 1 from private.suspensions x where x.user_id=p.author)
 and (p_before is null or (p.created_at,p.id)<(p_before,p_id))
 order by p.created_at desc,p.id desc limit 21
 ), roots as (select * from candidates order by created_at desc,id desc limit 20
 ), serialized as (
  select p.created_at,p.id,jsonb_build_object('id',p.id,'author',p.author,'name',p.alias,'title',p.title,'body',p.body,'status',p.status,'perspective',p.perspective,'verseId',p.verse_id,'reference',p.reference,
   'screening',case when mod then (select jsonb_build_object('flags',flags,'summary',summary,'createdAt',created_at) from private.community_screening where post_id=p.id) else null end,
   'replies',coalesce((select jsonb_agg(reply order by created_at,id) from (
    select r.created_at,r.id,jsonb_build_object('id',r.id,'author',r.author,'name',r.alias,'body',r.body,'status',r.status,'perspective',r.perspective,
     'screening',case when mod then (select jsonb_build_object('flags',flags,'summary',summary,'createdAt',created_at) from private.community_screening where post_id=r.id) else null end) reply
    from public.community_posts r where r.parent=p.id and private.community_readable(r.id) and (
     r.id in (select id from public.community_posts where parent=p.id and status='approved' and private.community_readable(id) order by created_at desc,id limit 100)
     or r.id in (select id from public.community_posts where parent=p.id and author=auth.uid() order by created_at desc,id limit 30)
     or (mod and r.id in (select id from public.community_posts where parent=p.id and status='pending' order by created_at desc,id limit 30))
     or (mod and r.id in (select post_id from selected_reports))
    )
   ) limited),'[]'::jsonb)) topic from roots p
 )
 select jsonb_build_object('topics',coalesce((select jsonb_agg(topic order by created_at desc,id desc) from serialized),'[]'::jsonb),
  'blocked',coalesce((select jsonb_agg(blocked_user_id) from public.blocks where user_id=auth.uid()),'[]'::jsonb),
  'reports',coalesce((select jsonb_agg(jsonb_build_object('id',id,'postId',post_id,'reason',reason,'resolved',resolved) order by resolved,created_at,id) from selected_reports),'[]'::jsonb),
  'nextCursor',case when (select count(*) from candidates)>20 then (select jsonb_build_object('before',created_at,'id',id) from roots order by created_at asc,id asc limit 1) else null end,
  'moderator',mod,'userId',auth.uid(),'limits',jsonb_build_object('topics',30,'repliesPerTopic',100,'ownSubmissions',30,'pendingQueue',30,'reports',100)) into result;
 return result;
end;$$;
revoke all on function private.community_feed(timestamptz,uuid) from public,anon;
grant execute on function private.community_feed(timestamptz,uuid) to authenticated;
create function public.community_feed(p_before timestamptz default null,p_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.community_feed(p_before,p_id)$$;
revoke all on function public.community_feed(timestamptz,uuid) from public,anon;
grant execute on function public.community_feed(timestamptz,uuid) to authenticated;
create index if not exists community_feed_order on public.community_posts(created_at desc,id desc) where parent is null and status='approved';
