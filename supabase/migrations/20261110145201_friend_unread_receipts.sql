-- A read cursor belongs to one member and one accepted friendship. It records
-- only a message that was actually returned to that member's conversation.
create table private.friend_reads (
 link_id uuid not null references private.friend_links(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 seen_at timestamptz not null,
 seen_id uuid not null,
 primary key (user_id, link_id)
);
alter table private.friend_reads enable row level security;
revoke all on private.friend_reads from public, anon, authenticated;

create function private.friend_mark_read(p_link uuid, p_message uuid) returns void
language plpgsql security definer set search_path='' as $$
declare u uuid := auth.uid(); other_user uuid; message_time timestamptz;
begin
 if u is null or not private.can_participate() then raise exception 'unauthorized'; end if;
 select case when l.sender=u then l.recipient else l.sender end into other_user
 from private.friend_links l where l.id=p_link and l.status='accepted' and u in(l.sender,l.recipient);
 if other_user is null or exists(select 1 from private.friend_blocks b where (b.actor=u and b.target=other_user) or (b.actor=other_user and b.target=u))
    or exists(select 1 from private.suspensions s where s.user_id=other_user) then raise exception 'unavailable'; end if;
 select created_at into message_time from private.friend_messages where id=p_message and link_id=p_link;
 if message_time is null then raise exception 'not_found'; end if;
 insert into private.friend_reads(link_id,user_id,seen_at,seen_id) values(p_link,u,message_time,p_message)
 on conflict(user_id,link_id) do update set seen_at=excluded.seen_at,seen_id=excluded.seen_id
 where (private.friend_reads.seen_at,private.friend_reads.seen_id)<(excluded.seen_at,excluded.seen_id);
end;$$;

create function private.friend_unread() returns integer
language plpgsql stable security definer set search_path='' as $$
declare u uuid := auth.uid(); total integer;
begin
 if u is null or not private.can_participate() then return 0; end if;
 select count(*)::integer into total from private.friend_links l
 join private.friend_messages m on m.link_id=l.id and m.sender<>u
 left join private.friend_reads r on r.link_id=l.id and r.user_id=u
 where u in(l.sender,l.recipient) and l.status='accepted'
 and (r.seen_at is null or (m.created_at,m.id)>(r.seen_at,r.seen_id))
 and not exists(select 1 from private.friend_blocks b where (b.actor=l.sender and b.target=l.recipient) or (b.actor=l.recipient and b.target=l.sender))
 and not exists(select 1 from private.suspensions s where s.user_id=case when l.sender=u then l.recipient else l.sender end);
 return total;
end;$$;

create function private.friend_unread_list() returns table(link_id uuid, name text, unread bigint, latest_at timestamptz)
language sql stable security definer set search_path='' as $$
 select l.id, d.name, count(*), max(m.created_at)
 from private.friend_links l
 join private.friend_directory d on d.user_id=case when l.sender=auth.uid() then l.recipient else l.sender end
 join private.friend_messages m on m.link_id=l.id and m.sender<>auth.uid()
 left join private.friend_reads r on r.link_id=l.id and r.user_id=auth.uid()
 where private.can_participate() and auth.uid() in(l.sender,l.recipient) and l.status='accepted'
 and (r.seen_at is null or (m.created_at,m.id)>(r.seen_at,r.seen_id))
 and not exists(select 1 from private.friend_blocks b where (b.actor=l.sender and b.target=l.recipient) or (b.actor=l.recipient and b.target=l.sender))
 and not exists(select 1 from private.suspensions s where s.user_id=d.user_id)
 group by l.id,d.name order by max(m.created_at) desc,l.id limit 200;
$$;

revoke all on function private.friend_mark_read(uuid,uuid), private.friend_unread() from public,anon;
grant execute on function private.friend_mark_read(uuid,uuid), private.friend_unread() to authenticated;
revoke all on function private.friend_unread_list() from public,anon;
grant execute on function private.friend_unread_list() to authenticated;
create function public.friend_mark_read(p_link uuid,p_message uuid) returns void language sql security invoker set search_path='' as $$ select private.friend_mark_read(p_link,p_message); $$;
create function public.friend_unread() returns integer language sql stable security invoker set search_path='' as $$ select private.friend_unread(); $$;
create function public.friend_unread_list() returns table(link_id uuid,name text,unread bigint,latest_at timestamptz) language sql stable security invoker set search_path='' as $$select * from private.friend_unread_list();$$;
revoke all on function public.friend_mark_read(uuid,uuid), public.friend_unread() from public,anon;
grant execute on function public.friend_mark_read(uuid,uuid), public.friend_unread() to authenticated;
revoke all on function public.friend_unread_list() from public,anon;
grant execute on function public.friend_unread_list() to authenticated;
