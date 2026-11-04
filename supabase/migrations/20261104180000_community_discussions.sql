-- Community is separate from the private diary and the existing Confession room.
-- Client roles have no table access. All mutations use checked, pinned-search-path RPCs.
create table public.community_posts (
 id uuid primary key default gen_random_uuid(),
 author uuid not null references auth.users(id) on delete cascade,
 parent uuid references public.community_posts(id) on delete cascade,
 alias text not null check(char_length(trim(alias)) between 1 and 40),
 title text check(title is null or char_length(trim(title)) between 1 and 100),
 body text not null check(char_length(trim(body)) between 1 and 2000),
 perspective text not null default 'Open discussion' check(perspective in ('Open discussion','Orthodox perspective','Catholic perspective','Protestant perspective')),
 verse_id text check(verse_id is null or verse_id ~ '^(web|dra|brenton):[A-Z0-9]{3}\.[1-9][0-9]{0,2}\.[1-9][0-9]{0,2}$'),
 reference text check(reference is null or char_length(reference) between 1 and 80),
 status text not null default 'pending' check(status in ('pending','approved','removed')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 check((parent is null and title is not null) or (parent is not null and title is null)),
 check((verse_id is null) = (reference is null))
);
create index community_roots_recent on public.community_posts(created_at desc) where parent is null;
create index community_parent_recent on public.community_posts(parent,created_at);
create index community_author_recent on public.community_posts(author,created_at desc);
create index community_pending_recent on public.community_posts(created_at desc) where status='pending';
create table public.community_reports (
 id uuid primary key default gen_random_uuid(),
 reporter uuid not null references auth.users(id) on delete cascade,
 post_id uuid not null references public.community_posts(id) on delete cascade,
 reason text not null check(char_length(trim(reason)) between 1 and 300),
 resolved boolean not null default false,
 created_at timestamptz not null default now(),
 resolved_at timestamptz,
 unique(reporter,post_id)
);
create index community_reports_queue on public.community_reports(created_at) where not resolved;
create table private.community_activity (
 id bigint generated always as identity primary key,
 actor uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('submit','report')),
 created_at timestamptz not null default now()
);
create index community_activity_limits on private.community_activity(actor,kind,created_at);
create table private.community_audit (
 id bigint generated always as identity primary key,
 actor uuid references auth.users(id) on delete set null,
 post_id uuid references public.community_posts(id) on delete set null,
 action text not null check(action in ('submit','approve','reject','report','resolve_keep','resolve_remove','delete','screen')),
 created_at timestamptz not null default now()
);
create table private.community_screening (
 post_id uuid primary key references public.community_posts(id) on delete cascade,
 flags text[] not null,
 summary text not null check(char_length(summary)<=600),
 created_at timestamptz not null default now()
);
alter table public.community_posts enable row level security;
alter table public.community_reports enable row level security;
alter table private.community_activity enable row level security;
alter table private.community_audit enable row level security;
alter table private.community_screening enable row level security;
revoke all on public.community_posts,public.community_reports,private.community_activity,private.community_audit,private.community_screening from public,anon,authenticated;
grant select,insert,update,delete on public.community_posts,public.community_reports to service_role;

create function private.community_moderator() returns boolean language sql stable security definer set search_path='' as $$
 select private.is_staff() and private.can_participate();
$$;
create function private.community_readable(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from public.community_posts p left join public.community_posts parent on parent.id=p.parent
  where p.id=p_id and (
   private.community_moderator() or
   (p.author=auth.uid() and (p.parent is null or parent.status='approved')) or
   (p.status='approved' and (p.parent is null or parent.status='approved')
    and not exists(select 1 from private.suspensions s where s.user_id=p.author)
    and not exists(select 1 from public.blocks b where b.user_id=auth.uid() and b.blocked_user_id in (p.author,parent.author))
    and not exists(select 1 from public.community_reports r where r.reporter=auth.uid() and not r.resolved and r.post_id in (p.id,p.parent)))
  )
 );
$$;
revoke all on function private.community_moderator(),private.community_readable(uuid) from public,anon,authenticated;

create function public.community_submit(p_title text,p_body text,p_alias text,p_perspective text,p_verse text default null,p_reference text default null,p_parent uuid default null)
 returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; root public.community_posts;
begin
 if not private.can_participate() then raise exception 'not_allowed';end if;
 if p_body is null or p_alias is null or p_perspective is null then raise exception 'invalid_submission';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,490041));
 if (select count(*) from private.community_activity where actor=auth.uid() and kind='submit' and created_at>now()-interval '1 minute')>=5
 or (select count(*) from private.community_activity where actor=auth.uid() and kind='submit' and created_at>now()-interval '1 day')>=40 then raise exception 'rate_limited';end if;
 if p_parent is not null then
  select * into root from public.community_posts where id=p_parent for update;
  if root.id is null or root.parent is not null or root.status<>'approved' or not private.community_readable(root.id) then raise exception 'not_found';end if;
 else
  if p_title is null or char_length(trim(p_title)) not between 1 and 100 then raise exception 'invalid_submission';end if;
 end if;
 insert into public.community_posts(author,parent,alias,title,body,perspective,verse_id,reference)
 values(auth.uid(),p_parent,trim(p_alias),case when p_parent is null then trim(p_title) else null end,trim(p_body),p_perspective,
  case when p_parent is null then p_verse else root.verse_id end,
  case when p_parent is null then nullif(trim(p_reference),'') else root.reference end) returning id into result;
 insert into private.community_activity(actor,kind) values(auth.uid(),'submit');
 insert into private.community_audit(actor,post_id,action) values(auth.uid(),result,'submit');
 return result;
end;$$;

create function public.community_review(p_post uuid,p_approve boolean) returns void language plpgsql security definer set search_path='' as $$
declare target public.community_posts;
begin
 if not private.community_moderator() or p_approve is null then raise exception 'not_allowed';end if;
 select * into target from public.community_posts where id=p_post for update;
 if target.id is null then raise exception 'not_found';end if;
 if p_approve and exists(select 1 from private.suspensions where user_id=target.author) then raise exception 'not_allowed';end if;
 if p_approve and target.parent is not null and not exists(select 1 from public.community_posts where id=target.parent and status='approved') then raise exception 'not_found';end if;
 update public.community_posts set status=case when p_approve then 'approved' else 'removed' end,reviewed_at=now() where id=p_post;
 insert into private.community_audit(actor,post_id,action) values(auth.uid(),p_post,case when p_approve then 'approve' else 'reject' end);
end;$$;

create function public.community_report(p_post uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare target public.community_posts;
begin
 if not private.can_participate() then raise exception 'not_allowed';end if;
 if p_reason is null or char_length(trim(p_reason)) not between 1 and 300 then raise exception 'invalid_report';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,490042));
 select * into target from public.community_posts where id=p_post;
 if target.id is null or target.author=auth.uid() or not private.community_readable(p_post) then raise exception 'not_found';end if;
 if exists(select 1 from public.community_reports where reporter=auth.uid() and post_id=p_post and not resolved) then return;end if;
 if (select count(*) from private.community_activity where actor=auth.uid() and kind='report' and created_at>now()-interval '1 hour')>=20 then raise exception 'rate_limited';end if;
 insert into public.community_reports(reporter,post_id,reason) values(auth.uid(),p_post,trim(p_reason))
 on conflict(reporter,post_id) do update set reason=excluded.reason,resolved=false,created_at=now(),resolved_at=null;
 insert into private.community_activity(actor,kind) values(auth.uid(),'report');
 insert into private.community_audit(actor,post_id,action) values(auth.uid(),p_post,'report');
end;$$;

create function public.community_resolve(p_report uuid,p_remove boolean) returns void language plpgsql security definer set search_path='' as $$
declare target public.community_reports;
begin
 if not private.community_moderator() or p_remove is null then raise exception 'not_allowed';end if;
 select * into target from public.community_reports where id=p_report and not resolved for update;
 if target.id is null then raise exception 'not_found';end if;
 if p_remove then update public.community_posts set status='removed',reviewed_at=now() where id=target.post_id;end if;
 update public.community_reports set resolved=true,resolved_at=now() where id=p_report;
 insert into private.community_audit(actor,post_id,action) values(auth.uid(),target.post_id,case when p_remove then 'resolve_remove' else 'resolve_keep' end);
end;$$;

create function public.community_delete(p_post uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'unauthorized';end if;
 if not exists(select 1 from public.community_posts where id=p_post and author=auth.uid()) then raise exception 'not_found';end if;
 insert into private.community_audit(actor,post_id,action) values(auth.uid(),p_post,'delete');
 delete from public.community_posts where id=p_post and author=auth.uid();
end;$$;

create function public.community_snapshot(p_topic uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; mod boolean:=private.community_moderator();
begin
 if auth.uid() is null then raise exception 'unauthorized';end if;
 with selected_reports as (
  select * from public.community_reports where reporter=auth.uid() or (mod and not resolved)
  order by case when mod and not resolved then 0 else 1 end,
   case when mod and not resolved then created_at end asc,created_at desc,id limit 100
 ), roots as (
  select p.* from public.community_posts p where p.parent is null and private.community_readable(p.id)
  and (p.id in (select id from public.community_posts where parent is null and status='approved' and private.community_readable(id) order by created_at desc,id limit 30)
   or p.id=p_topic
   or p.id in (select coalesce(parent,id) from public.community_posts where author=auth.uid() order by created_at desc,id limit 30)
   or (mod and p.id in (select coalesce(parent,id) from public.community_posts where status='pending' order by created_at desc,id limit 30))
   or (mod and p.id in (select coalesce(p2.parent,p2.id) from public.community_posts p2 join selected_reports r on r.post_id=p2.id)))
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
 select jsonb_build_object('topics',coalesce((select jsonb_agg(topic order by created_at desc,id) from serialized),'[]'::jsonb),
  'blocked',coalesce((select jsonb_agg(blocked_user_id) from public.blocks where user_id=auth.uid()),'[]'::jsonb),
  'reports',coalesce((select jsonb_agg(jsonb_build_object('id',id,'postId',post_id,'reason',reason,'resolved',resolved) order by resolved,created_at,id) from selected_reports),'[]'::jsonb),
  'moderator',mod,'userId',auth.uid(),'limits',jsonb_build_object('topics',30,'repliesPerTopic',100,'ownSubmissions',30,'pendingQueue',30,'reports',100)) into result;
 return result;
end;$$;

-- AI assistance can only annotate an existing pending item, never change publication.
create function public.community_screening_candidate(p_post uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'title',p.title,'body',p.body,'perspective',p.perspective,
  'context',(select left(body,2000) from public.community_posts where id=p.parent))
 from public.community_posts p where p.id=p_post and p.status='pending';
$$;
create function public.community_screening_result(p_post uuid,p_flags text[],p_summary text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_flags is null or p_summary is null or not p_flags <@ array['abuse','threat','hate','sexual_exploitation','privacy','spam','self_harm','needs_context','scam','harmful_advice']::text[] then raise exception 'invalid_screening';end if;
 perform 1 from public.community_posts where id=p_post and status='pending' for update;
 if not found then raise exception 'not_found';end if;
 insert into private.community_screening(post_id,flags,summary) values(p_post,p_flags,left(p_summary,600)) on conflict(post_id) do update set flags=excluded.flags,summary=excluded.summary,created_at=now();
 insert into private.community_audit(post_id,action) values(p_post,'screen');
end;$$;

revoke all on function public.community_submit(text,text,text,text,text,text,uuid),public.community_snapshot(uuid),public.community_review(uuid,boolean),public.community_report(uuid,text),public.community_resolve(uuid,boolean),public.community_delete(uuid) from public,anon,authenticated;
grant execute on function public.community_submit(text,text,text,text,text,text,uuid),public.community_snapshot(uuid),public.community_review(uuid,boolean),public.community_report(uuid,text),public.community_resolve(uuid,boolean),public.community_delete(uuid) to authenticated;
revoke all on function public.community_screening_candidate(uuid),public.community_screening_result(uuid,text[],text) from public,anon,authenticated;
grant execute on function public.community_screening_candidate(uuid),public.community_screening_result(uuid,text[],text) to service_role;

-- Keep the existing shared minute/daily/project budget, adding a distinct allowed
-- request kind. AI failure cannot change a post's pending publication status.
create or replace function public.reserve_ai_request(p_user uuid,p_kind text) returns boolean language plpgsql security definer set search_path='' as $$
declare keys text[]; limits int[]:=array[5,30,500]; i int; t timestamptz:=clock_timestamp();
begin
 if p_kind not in ('journey','transcribe','community_screening') or not exists(select 1 from auth.users where id=p_user) then return false;end if;
 perform pg_advisory_xact_lock(731209441);
 delete from private.ai_usage where expires_at<t;
 keys:=array['minute:'||p_user::text||':'||to_char(t at time zone 'UTC','YYYYMMDDHH24MI'),'day:'||p_user::text||':'||to_char(t at time zone 'UTC','YYYYMMDD'),'global:'||to_char(t at time zone 'UTC','YYYYMMDD')];
 for i in 1..3 loop
  if coalesce((select requests from private.ai_usage where key=keys[i]),0)>=limits[i] then return false;end if;
 end loop;
 for i in 1..3 loop
  insert into private.ai_usage(key,requests,expires_at) values(keys[i],1,t+interval '2 days') on conflict(key) do update set requests=private.ai_usage.requests+1;
 end loop;
 return true;
end;$$;
revoke all on function public.reserve_ai_request(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_ai_request(uuid,text) to service_role;
