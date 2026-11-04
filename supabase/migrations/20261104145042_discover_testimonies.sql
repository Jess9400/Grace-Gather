-- Drafts, authorship and review notes never enter the public feed payload.
create table private.testimonies (
 id uuid primary key default gen_random_uuid(), author uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(trim(title)) between 3 and 160), body text not null check(length(trim(body)) between 20 and 20000),
 display_name text not null check(length(trim(display_name)) between 1 and 60), anonymous boolean not null default false,
 tags text[] not null default '{}', language text not null check(language in ('en','pt','es','ru')),
 status text not null default 'draft' check(status in ('draft','pending','published','rejected')),
 revision integer not null default 1, rejection_reason text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz,
 check(cardinality(tags)<=5), check(length(array_to_string(tags,','))<=200)
);
alter table private.testimonies enable row level security;
create index testimonies_author_updated on private.testimonies(author,updated_at desc);
create index testimonies_pending on private.testimonies(updated_at) where status='pending';
create table private.testimony_audit(id uuid primary key default gen_random_uuid(),testimony uuid,actor uuid,action text,revision integer,created_at timestamptz default now());
alter table private.testimony_audit enable row level security;
revoke all on private.testimonies,private.testimony_audit from public,anon,authenticated;

alter table public.content_items add column sort_at timestamptz not null default now();
update public.content_items set sort_at='1970-01-01T00:00:00Z' where kind='feed';
create index content_feed_order on public.content_items(sort_at desc,id desc) where published and kind='feed';
create table public.saved_items(item_id text references public.content_items(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(item_id,user_id));
create index saved_items_owner on public.saved_items(user_id,created_at desc);
alter table public.saved_items enable row level security;
revoke all on public.saved_items from public,anon,authenticated;
grant select,insert,delete on public.saved_items to authenticated;
create policy own_saves on public.saved_items for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.content_items c where c.id=item_id and c.published));
create table public.shared_items(item_id text references public.content_items(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(item_id,user_id));
alter table public.shared_items enable row level security;
revoke all on public.shared_items from public,anon,authenticated;
grant select,insert on public.shared_items to authenticated;
create policy own_shares on public.shared_items for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.content_items c where c.id=item_id and c.published));

create function private.testimony_command(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare t private.testimonies; uid uuid:=auth.uid(); tid uuid; result jsonb; pubname text;
begin
 if uid is null then raise exception 'Sign in to manage testimonies.'; end if;
 if p_action='mine' then return (select coalesce(jsonb_agg(to_jsonb(x)-'author'),'[]') from (select * from private.testimonies where author=uid order by updated_at desc limit 100) x);end if;
 if p_action='queue' then
  if not private.is_staff() then raise exception 'Moderator access required.';end if;
  return (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select * from private.testimonies where status='pending' order by updated_at limit 100) x);
 end if;
 if p_data->>'id' is not null then tid:=(p_data->>'id')::uuid;select * into t from private.testimonies where id=tid for update;
  if t.id is null or (t.author<>uid and not private.is_staff()) then raise exception 'Testimony not found.';end if;
 end if;
 if p_action='read' then return to_jsonb(t)-'author';end if;
 if p_action='delete' then
  if t.id is null or t.author<>uid then raise exception 'Only the author can delete this testimony.';end if;
  delete from public.content_items where id='testimony-'||t.id;delete from private.testimonies where id=t.id;return '{"deleted":true}';
 end if;
 if p_action='hide' then
  if not private.is_staff() or t.id is null then raise exception 'Moderator access required.';end if;
  if length(trim(coalesce(p_data->>'reason','')))<5 then raise exception 'Give the author a private explanation.';end if;
  update private.testimonies set status='rejected',rejection_reason=left(p_data->>'reason',2000),updated_at=now() where id=t.id;
  update public.content_items set published=false where id='testimony-'||t.id;
  insert into private.testimony_audit(testimony,actor,action,revision) values(t.id,uid,'hide',t.revision);return '{"hidden":true}';
 end if;
 if p_action='review' then
  if not private.is_staff() then raise exception 'Moderator access required.';end if;
  if t.id is null or t.status<>'pending' or t.revision is distinct from (p_data->>'revision')::integer then raise exception 'This version changed. Reload before reviewing.';end if;
  if p_data->>'decision'='approve' then
   pubname:=case when t.anonymous then 'Anonymous member' else t.display_name end;
   update private.testimonies set status='published',rejection_reason='',published_at=coalesce(published_at,now()),updated_at=now() where id=t.id returning * into t;
   insert into public.content_items(id,kind,data,published,sort_at) values('testimony-'||t.id,'feed',jsonb_build_object('id','testimony-'||t.id,'type','testimonies','origin','community','title',jsonb_build_object(t.language,t.title),'body',jsonb_build_object(t.language,t.body),'summary',jsonb_build_object(t.language,t.body),'tags',t.tags,'source',pubname,'anonymous',t.anonymous,'lang',t.language,'publishedAt',t.published_at,'updatedAt',t.updated_at),true,t.published_at)
   on conflict(id) do update set data=excluded.data,published=true,sort_at=excluded.sort_at,updated_at=now();
  elsif p_data->>'decision'='reject' then
   if length(trim(coalesce(p_data->>'reason','')))<5 then raise exception 'Give the author a private explanation.';end if;
   update private.testimonies set status='rejected',rejection_reason=left(p_data->>'reason',2000),updated_at=now() where id=t.id;
   update public.content_items set published=false where id='testimony-'||t.id;
  else raise exception 'Invalid decision.';end if;
  insert into private.testimony_audit(testimony,actor,action,revision) values(t.id,uid,p_data->>'decision',t.revision);return '{"reviewed":true}';
 end if;
 if p_action not in ('draft','publish') then raise exception 'Invalid action.';end if;
 if not private.can_participate() then raise exception 'Posting is unavailable for this account.';end if;
 if t.id is not null and t.author<>uid then raise exception 'Only the author can edit their words.';end if;
 if t.id is not null and t.revision<>coalesce((p_data->>'revision')::integer,0) then raise exception 'This draft changed in another window. Reload it first.';end if;
 if p_action='publish' and (p_data->>'previewed' is distinct from 'true' or p_data->>'audience' is distinct from 'discover_public') then raise exception 'Preview and confirm the Discover audience before publishing.';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,41));
 if t.id is null and (select count(*) from private.testimonies where author=uid and created_at>now()-interval '1 day')>=10 then raise exception 'Daily testimony limit reached.';end if;
 if t.id is null then
  insert into private.testimonies(author,title,body,display_name,anonymous,tags,language,status) values(uid,p_data->>'title',p_data->>'body',p_data->>'displayName',coalesce((p_data->>'anonymous')::boolean,false),array(select jsonb_array_elements_text(coalesce(p_data->'tags','[]'))),p_data->>'language',case when p_action='publish' then 'pending' else 'draft' end) returning * into t;
 else
  update private.testimonies set title=p_data->>'title',body=p_data->>'body',display_name=p_data->>'displayName',anonymous=coalesce((p_data->>'anonymous')::boolean,false),tags=array(select jsonb_array_elements_text(coalesce(p_data->'tags','[]'))),language=p_data->>'language',status=case when p_action='publish' then 'pending' else 'draft' end,revision=revision+1,rejection_reason='',updated_at=now() where id=t.id returning * into t;
  update public.content_items set published=false where id='testimony-'||t.id;
 end if;
 insert into private.testimony_audit(testimony,actor,action,revision) values(t.id,uid,p_action,t.revision);
 return to_jsonb(t)-'author';
end;$$;
revoke all on function private.testimony_command(text,jsonb) from public,anon;
grant execute on function private.testimony_command(text,jsonb) to authenticated;
create function public.testimony_command(p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.testimony_command(p_action,p_data)$$;
revoke all on function public.testimony_command(text,jsonb) from public,anon;
grant execute on function public.testimony_command(text,jsonb) to authenticated;

create function public.discover_page(p_filter text default 'all',p_before timestamptz default null,p_after_id text default '',p_limit integer default 15,p_search text default '') returns table(id text,data jsonb,sort_at timestamptz) language sql stable security invoker set search_path='' as $$
 select c.id,c.data,c.sort_at from public.content_items c where c.published and c.kind='feed'
 and (p_filter<>'all' or coalesce(c.data->>'origin','')<>'news' or c.sort_at>=now()-interval '24 hours')
 and (p_before is null or (c.sort_at,c.id)<(p_before,p_after_id))
 and (p_filter='all' or (p_filter='news' and c.data->>'origin'='news' and c.sort_at>=now()-interval '24 hours' and c.sort_at<=now()) or (p_filter='older' and c.data->>'origin'='news' and c.sort_at<now()-interval '24 hours') or (p_filter='saved' and exists(select 1 from public.saved_items s where s.item_id=c.id and s.user_id=auth.uid())) or (p_filter not in ('all','news','older','saved') and c.data->>'type'=p_filter))
 and (p_search='' or concat_ws(' ',c.data->>'title',c.data->>'summary',c.data->>'tags') ilike '%'||left(p_search,100)||'%')
 order by c.sort_at desc,c.id desc limit greatest(1,least(p_limit,30));$$;
-- The saved filter uses a private ownership predicate; anon needs SELECT with an always-false policy.
grant select on public.saved_items to anon;
create policy anonymous_no_saves on public.saved_items for select to anon using(false);
revoke all on function public.discover_page(text,timestamptz,text,integer,text) from public;
grant execute on function public.discover_page(text,timestamptz,text,integer,text) to anon,authenticated;

create function private.discover_state(p_ids text[]) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'likes',(select count(*) from public.likes l where l.item_id=c.id),'comments',(select count(*) from public.comments m where m.item_id=c.id and m.status='approved' and not exists(select 1 from public.blocks b where b.user_id=auth.uid() and b.blocked_user_id=m.user_id)),'liked',exists(select 1 from public.likes l where l.item_id=c.id and l.user_id=auth.uid()),'saved',exists(select 1 from public.saved_items s where s.item_id=c.id and s.user_id=auth.uid()))),'[]') from public.content_items c where c.published and c.id=any(p_ids[1:30]);$$;
revoke all on function private.discover_state(text[]) from public;
grant usage on schema private to anon;
grant execute on function private.discover_state(text[]) to anon,authenticated;
create function public.discover_state(p_ids text[]) returns jsonb language sql stable security invoker set search_path='' as $$select private.discover_state(p_ids)$$;
revoke all on function public.discover_state(text[]) from public;
grant execute on function public.discover_state(text[]) to anon,authenticated;
-- Preserve all existing ownership and moderation checks. Only comments on published stories are readable.
drop policy readable_comments on public.comments;
create policy readable_comments on public.comments for select to authenticated using(private.is_staff() or (exists(select 1 from public.content_items c where c.id=item_id and c.published) and (user_id=(select auth.uid()) or (status='approved' and not exists(select 1 from public.blocks b where b.user_id=(select auth.uid()) and b.blocked_user_id=comments.user_id)))));
