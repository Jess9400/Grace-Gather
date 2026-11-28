-- Context-scoped private notes. Existing notes become personal notes unchanged.
create table private.study_context_notes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in('personal','plan','devotional')),
 context_id text not null default '' check(length(context_id)<=100),
 verse text not null check(length(verse) between 1 and 256),
 reference text not null check(length(reference) between 1 and 200),
 body text not null check(length(body) between 1 and 20000),
 updated_at timestamptz not null default now(),
 unique(user_id,kind,context_id,verse)
);
insert into private.study_context_notes(user_id,kind,verse,reference,body,updated_at)
select user_id,'personal',verse,reference,body,updated_at from private.study_notes;
create index study_context_owner on private.study_context_notes(user_id,kind,updated_at desc);
alter table private.study_context_notes enable row level security;
revoke all on private.study_context_notes from public,anon,authenticated;
alter table private.study_shared_notes add column note_id uuid references private.study_context_notes(id) on delete cascade;
update private.study_shared_notes s set note_id=n.id from private.study_context_notes n where n.user_id=s.author and n.verse=s.verse and n.kind='personal';
alter table private.study_shared_notes drop constraint study_shared_notes_invitation_author_verse_key;
create unique index study_shared_context_note on private.study_shared_notes(invitation,author,note_id);
create table private.study_note_comments (
 id uuid primary key default gen_random_uuid(),
 note_id uuid not null references private.study_shared_notes(id) on delete cascade,
 author uuid not null references auth.users(id) on delete cascade,
 body text not null check(length(body) between 1 and 4000),
 created_at timestamptz not null default now()
);
create index study_note_comments_thread on private.study_note_comments(note_id,created_at,id);
create index study_note_comments_author on private.study_note_comments(author,created_at);
alter table private.study_note_comments enable row level security;
revoke all on private.study_note_comments from public,anon,authenticated;
-- Keep the tested invitation, friendship, consent, blocking and revocation rules.
alter function private.study_notebook(text,jsonb) rename to study_notebook_before_context;
revoke all on function private.study_notebook_before_context(text,jsonb) from public,anon,authenticated;
create function private.study_notebook(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); k text:=coalesce(p_data->>'kind','personal'); ctx text:=coalesce(p_data->>'context','');
 v text:=trim(coalesce(p_data->>'verse','')); b text:=trim(coalesce(p_data->>'body','')); r text:=trim(coalesce(p_data->>'reference',''));
 n private.study_context_notes; inv private.study_plan_invites; shared private.study_shared_notes; result jsonb; skip integer; needle text;
begin
 if u is null or not exists(select 1 from auth.users where id=u and (email_confirmed_at is not null or phone_confirmed_at is not null)) then raise exception 'sign_in_required'; end if;
 if octet_length(coalesce(p_data,'{}')::text)>85000 then raise exception 'invalid_input'; end if;
 if k not in('personal','plan','devotional') or length(ctx)>100 or (k='personal' and ctx<>'') then raise exception 'invalid_context'; end if;
 if k='plan' and ctx<>'' and (ctx !~ '^(0|[1-9][0-9]?)$' or ctx::integer>14) then raise exception 'invalid_context'; end if;
 if k in('plan','devotional') and ctx='' and p_action in('note','save','delete','share') then raise exception 'invalid_context'; end if;
 skip:=greatest(0,least(5000,coalesce((p_data->>'offset')::integer,0)));
 if p_action='stats' then return jsonb_build_object('notes',(select count(*) from private.study_context_notes where user_id=u));
 elsif p_action='notes' then
  needle:=left(trim(coalesce(p_data->>'search','')),200);
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (
   select id,kind,context_id,verse,reference,body,updated_at from private.study_context_notes where user_id=u
    and (not(p_data ? 'kind') or kind=k) and (not(p_data ? 'context') or context_id=ctx)
    and (needle='' or strpos(lower(body),lower(needle))>0 or strpos(lower(reference),lower(needle))>0)
   order by updated_at desc,id limit 50 offset skip
  ) x;return result;
 elsif p_action='note' then
  select * into n from private.study_context_notes where user_id=u and kind=k and context_id=ctx and verse=v;
  return case when n.id is null then 'null'::jsonb else to_jsonb(n)-'user_id' end;
 elsif p_action='save' then
  if length(v) not between 1 and 256 or length(r) not between 1 and 200 or length(b) not between 1 and 20000 then raise exception 'invalid_input'; end if;
  insert into private.study_context_notes(user_id,kind,context_id,verse,reference,body) values(u,k,ctx,v,r,b)
   on conflict(user_id,kind,context_id,verse) do update set body=excluded.body,reference=excluded.reference,updated_at=now() returning * into n;
  return jsonb_build_object('saved',true,'id',n.id);
 elsif p_action='delete' then
  delete from private.study_context_notes where user_id=u and kind=k and context_id=ctx and verse=v;
  return jsonb_build_object('deleted',true);
 end if;
 if p_action not in('shared','share','comments','comment','delete_comment','shared_all') then
  return private.study_notebook_before_context(p_action,p_data);
 end if;
 if not private.can_participate() then raise exception 'forbidden'; end if;
 if p_action='shared_all' then
  needle:=left(trim(coalesce(p_data->>'search','')),200);
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (
   select s.id,s.note_id,s.invitation,s.verse,s.reference,s.body,s.updated_at,s.author=u as mine,d.name,i.plan,'plan' as kind,i.plan::text as context_id
   from private.study_shared_notes s join private.study_plan_invites i on i.id=s.invitation
   left join private.friend_directory d on d.user_id=s.author
   where u in(i.inviter,i.invitee) and i.status='accepted'
    and not exists(select 1 from private.friend_blocks where (actor=i.inviter and target=i.invitee) or (actor=i.invitee and target=i.inviter))
    and not exists(select 1 from private.suspensions where user_id in(i.inviter,i.invitee))
    and (needle='' or strpos(lower(s.body),lower(needle))>0 or strpos(lower(s.reference),lower(needle))>0)
   order by s.updated_at desc,s.id limit 50 offset skip
  ) x;return result;
 end if;
 select * into inv from private.study_plan_invites where id=(p_data->>'invitation')::uuid and u in(inviter,invitee) for update;
 if inv.id is null or inv.status<>'accepted' then raise exception 'acceptance_required'; end if;
 if exists(select 1 from private.friend_blocks where (actor=inv.inviter and target=inv.invitee) or (actor=inv.invitee and target=inv.inviter))
  or exists(select 1 from private.suspensions where user_id in(inv.inviter,inv.invitee)) then raise exception 'unavailable'; end if;
 if p_action='shared' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (
   select s.id,s.note_id,s.invitation,s.verse,s.reference,s.body,s.updated_at,s.author=u as mine,d.name,cn.kind,cn.context_id
   from private.study_shared_notes s left join private.study_context_notes cn on cn.id=s.note_id left join private.friend_directory d on d.user_id=s.author
   where s.invitation=inv.id order by s.updated_at desc,s.id limit 50 offset skip
  ) x;return result;
 elsif p_action='share' then
  select * into n from private.study_context_notes where user_id=u and kind=k and context_id=ctx and verse=v;
  if n.id is null then raise exception 'note_required'; end if;
  if k='plan' and ctx<>inv.plan::text then raise exception 'wrong_plan'; end if;
  insert into private.study_shared_notes(invitation,author,note_id,verse,reference,body) values(inv.id,u,n.id,n.verse,n.reference,n.body)
   on conflict(invitation,author,note_id) do update set body=excluded.body,reference=excluded.reference,updated_at=now();
  return jsonb_build_object('shared',true);
 end if;
 select * into shared from private.study_shared_notes where id=(p_data->>'note')::uuid and invitation=inv.id;
 if shared.id is null then raise exception 'unavailable'; end if;
 if p_action='comments' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into result from (
   select c.id,c.body,c.created_at,c.author=u as mine,d.name from private.study_note_comments c left join private.friend_directory d on d.user_id=c.author
   where c.note_id=shared.id order by c.created_at,c.id limit 50 offset skip
  ) x;return result;
 elsif p_action='comment' then
  if length(b) not between 1 and 4000 then raise exception 'invalid_input'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,251125));
  if (select count(*) from private.study_note_comments where author=u and created_at>now()-interval '1 hour')>=60 then raise exception 'rate_limited'; end if;
  insert into private.study_note_comments(note_id,author,body) values(shared.id,u,b);
  return jsonb_build_object('saved',true);
 elsif p_action='delete_comment' then
  delete from private.study_note_comments where id=(p_data->>'comment')::uuid and note_id=shared.id and author=u;
  return jsonb_build_object('deleted',true);
 end if;
 raise exception 'invalid_action';
end; $$;
revoke all on function private.study_notebook(text,jsonb) from public,anon;
grant execute on function private.study_notebook(text,jsonb) to authenticated;
-- Rebind the invoker wrapper to the new function; older clients keep personal notes.
create or replace function public.study_notebook(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.study_notebook(p_action,p_data);$$;
revoke all on function public.study_notebook(text,jsonb) from public,anon;
grant execute on function public.study_notebook(text,jsonb) to authenticated;

alter table private.activity_notices drop constraint activity_notices_kind_check;
alter table private.activity_notices add constraint activity_notices_kind_check check(kind in('confession_reply','discussion_reply','confession_thanks','study_invitation','study_comment'));
create function private.study_invite_notice() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='pending' and (tg_op='INSERT' or old.status in('declined','revoked')) then
  insert into private.activity_notices(recipient,actor,kind,target,source) values(new.invitee,new.inviter,'study_invitation',new.id::text,new.id::text||':'||new.updated_at::text) on conflict do nothing;
 elsif tg_op='UPDATE' and new.status='accepted' and old.status='pending' then
  insert into private.activity_notices(recipient,actor,kind,target,source) values(new.inviter,new.invitee,'study_invitation',new.id::text,new.id::text||':accepted:'||new.updated_at::text) on conflict do nothing;
 end if;
 return new;
end; $$;
revoke all on function private.study_invite_notice() from public,anon,authenticated;
create trigger study_invite_notice after insert or update of status on private.study_plan_invites for each row execute function private.study_invite_notice();
create function private.study_comment_notice() returns trigger language plpgsql security definer set search_path='' as $$
declare i private.study_plan_invites; s private.study_shared_notes; recipient_id uuid;
begin
 select * into s from private.study_shared_notes where id=new.note_id;
 select * into i from private.study_plan_invites where id=s.invitation and status='accepted';
 if i.id is null then return new; end if;
 recipient_id:=case when i.inviter=new.author then i.invitee else i.inviter end;
 insert into private.activity_notices(recipient,actor,kind,target,source) values(recipient_id,new.author,'study_comment',i.id::text,new.id::text) on conflict do nothing;
 return new;
end; $$;
revoke all on function private.study_comment_notice() from public,anon,authenticated;
create trigger study_comment_notice after insert on private.study_note_comments for each row execute function private.study_comment_notice();
-- Expired invitations, blocks and revoked sharing disappear from the inbox and
-- cannot dispatch a phone alert. Private note/comment text never enters a push.
create function private.study_activity_visible(p_user uuid,p_kind text,p_target text,p_source text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.study_plan_invites i where i.id::text=p_target and p_user in(i.inviter,i.invitee)
 and i.status in('pending','accepted') and (p_kind='study_invitation' or (i.status='accepted' and exists(select 1 from private.study_note_comments c join private.study_shared_notes s on s.id=c.note_id where c.id::text=p_source and s.invitation=i.id)))
 and not exists(select 1 from private.friend_blocks where (actor=i.inviter and target=i.invitee) or (actor=i.invitee and target=i.inviter))
 and not exists(select 1 from private.suspensions where user_id in(i.inviter,i.invitee)));
$$;
revoke all on function private.study_activity_visible(uuid,text,text,text) from public,anon,authenticated;
alter function private.activity_snapshot_for_version(boolean) rename to activity_snapshot_before_study;
create function private.activity_snapshot_for_version(p_v2 boolean) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare base jsonb; items jsonb; unread integer;
begin
 base:=private.activity_snapshot_before_study(p_v2);
 select coalesce(jsonb_agg(x order by x->>'created_at' desc),'[]'),count(*) filter(where not (x->>'is_read')::boolean) into items,unread
 from jsonb_array_elements(base->'items') x where x->>'kind' not in('study_invitation','study_comment') or exists(select 1 from private.activity_notices n where n.id::text=x->>'id' and n.recipient=auth.uid() and private.study_activity_visible(n.recipient,n.kind,n.target,n.source));
 return jsonb_set(jsonb_set(base,'{items}',items),'{unread}',to_jsonb(unread));
end; $$;
revoke all on function private.activity_snapshot_for_version(boolean) from public,anon,authenticated;
alter function private.member_push_still_relevant(uuid,text,uuid) rename to member_push_before_study;
create function private.member_push_still_relevant(p_user uuid,p_kind text,p_source uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare n private.activity_notices;
begin
 if p_kind='activity' then
  select * into n from private.activity_notices where id=p_source and recipient=p_user and kind in('study_invitation','study_comment');
  if n.id is not null then return not n.is_read and private.study_activity_visible(p_user,n.kind,n.target,n.source); end if;
 end if;
 return private.member_push_before_study(p_user,p_kind,p_source);
end; $$;
revoke all on function private.member_push_still_relevant(uuid,text,uuid) from public,anon,authenticated;
-- Wrappers are PL/pgSQL and resolve the replaced functions at call time.
-- Existing pending invitations were previously silent: make them discoverable too.
insert into private.activity_notices(recipient,actor,kind,target,source)
select invitee,inviter,'study_invitation',id::text,id::text||':pending-backfill'
from private.study_plan_invites i where status='pending'
 and not exists(select 1 from private.activity_notices n where n.kind='study_invitation' and n.target=i.id::text and n.recipient=i.invitee)
on conflict do nothing;
