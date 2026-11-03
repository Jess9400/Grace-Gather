-- New native backend. Existing Sites/D1 data is intentionally not moved automatically.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '' check(char_length(name)<=60),
 city text not null default '' check(char_length(city)<=80),
 region text not null default '' check(char_length(region)<=80),country text not null default 'BR',
 language text not null default 'en' check(language in ('en','pt','es','ru')),
 tradition text not null default 'protestant' check(tradition in ('protestant','catholic','orthodox')),
 scripture_language text not null default 'en' check(scripture_language in ('en','pt','es','ru')),
 edition text not null default 'web',intent text not null default 'faith',
 notification_email text not null default '' check(char_length(notification_email)<=254),
 email_consent boolean not null default false, consent_at timestamptz,
 updated_at timestamptz not null default now(),
 check ((email_consent and notification_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or (not email_consent and notification_email=''))
);
create table public.content_items(id text primary key,kind text not null check(kind in ('feed','course','organization')),data jsonb not null,published boolean not null default false,updated_at timestamptz not null default now());
create table private.staff(user_id uuid primary key references auth.users(id) on delete cascade,role text not null check(role in ('moderator','admin')));
create table private.suspensions(user_id uuid primary key references auth.users(id) on delete cascade,reason text not null,created_at timestamptz not null default now());
create function private.is_staff() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from private.staff where user_id=(select auth.uid())); $$;
create function private.can_participate() returns boolean language sql stable security definer set search_path='' as $$ select (select auth.uid()) is not null and not exists(select 1 from private.suspensions where user_id=(select auth.uid())); $$;
grant usage on schema private to authenticated;
grant execute on function private.is_staff(),private.can_participate() to authenticated;
create table public.likes(item_id text references public.content_items(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(item_id,user_id));
create table public.comments(id uuid primary key default gen_random_uuid(),item_id text not null references public.content_items(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,alias text not null check(char_length(trim(alias)) between 1 and 40),body text not null check(char_length(trim(body)) between 1 and 600),status text not null default 'pending' check(status in ('pending','approved','removed')),created_at timestamptz not null default now());
create index comments_item_created on public.comments(item_id,created_at);
create index comments_author_created on public.comments(user_id,created_at);
create table public.blocks(user_id uuid references auth.users(id) on delete cascade,blocked_user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,blocked_user_id),check(user_id<>blocked_user_id));
create table public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references auth.users(id) on delete cascade,comment_id uuid references public.comments(id) on delete cascade,item_id text references public.content_items(id) on delete cascade,reason text not null check(reason in ('abuse','harm','spam','rights','other')),detail text not null default '' check(char_length(detail)<=1000),status text not null default 'open' check(status in ('open','reviewed')),created_at timestamptz not null default now(),check(comment_id is not null or item_id is not null));
create table public.gatherings(id uuid primary key default gen_random_uuid(),title jsonb not null,description jsonb not null,host_id uuid references auth.users(id) on delete set null,host_name text not null,starts_at timestamptz not null,ends_at timestamptz not null,timezone text not null default 'America/Sao_Paulo',capacity integer not null default 20 check(capacity between 2 and 100),status text not null default 'draft' check(status in ('draft','published','cancelled','ended')),room_name text not null unique default gen_random_uuid()::text,check(ends_at>starts_at));
create table public.memberships(gathering_id uuid references public.gatherings(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,can_speak boolean not null default false,hand_raised boolean not null default false,joined_at timestamptz not null default now(),primary key(gathering_id,user_id));
create table public.series_interest(user_id uuid primary key references auth.users(id) on delete cascade,series text not null default 'thursday',created_at timestamptz not null default now());
create table public.devices(user_id uuid references auth.users(id) on delete cascade,token text not null check(char_length(token)<300),enabled boolean not null default true,updated_at timestamptz not null default now(),primary key(user_id,token));
create table public.backups(user_id uuid primary key references auth.users(id) on delete cascade,object_path text not null,updated_at timestamptz not null default now(),check(object_path=user_id::text||'/journal.bin'));
create table private.apple_tokens(user_id uuid primary key references auth.users(id) on delete cascade,encrypted_token text not null,created_at timestamptz not null default now());
create table private.delivery_jobs(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,channel text not null check(channel in ('email','push')),kind text not null check(kind in ('gathering','journal')),subject text not null,body text not null,due_at timestamptz not null,state text not null default 'pending' check(state in ('pending','sending','sent','failed','cancelled')),attempts integer not null default 0,locked_until timestamptz,unique_key text unique not null);
-- Explicit table permissions: comments, membership and moderation writes use checked RPCs.
grant select,insert,update,delete on public.profiles,public.devices,public.backups to authenticated;
grant select on public.content_items to anon,authenticated;
grant select on public.comments,public.gatherings,public.memberships,public.reports to authenticated;
grant select,insert,delete on public.likes,public.blocks,public.series_interest to authenticated;
grant delete on public.comments to authenticated;
grant insert,update,delete on public.content_items,public.gatherings to authenticated;
grant update(status) on public.comments,public.reports to authenticated;
grant update(can_speak) on public.memberships to authenticated;
alter table public.profiles enable row level security;
create policy own_profile on public.profiles for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
alter table public.content_items enable row level security;
create policy published_content on public.content_items for select to anon,authenticated using(published);
create policy staff_content on public.content_items for all to authenticated using(private.is_staff()) with check(private.is_staff());
alter table public.likes enable row level security;
create policy own_likes on public.likes for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and private.can_participate() and exists(select 1 from public.content_items c where c.id=item_id and c.published and c.kind='feed'));
alter table public.blocks enable row level security;
create policy own_blocks on public.blocks for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
alter table public.comments enable row level security;
create policy readable_comments on public.comments for select to authenticated using(private.is_staff() or user_id=(select auth.uid()) or (status='approved' and not exists(select 1 from public.blocks b where b.user_id=(select auth.uid()) and b.blocked_user_id=comments.user_id)));
create policy delete_own_comment on public.comments for delete to authenticated using(user_id=(select auth.uid()));
create policy moderate_comments on public.comments for update to authenticated using(private.is_staff()) with check(private.is_staff());
alter table public.reports enable row level security;
create policy own_or_staff_reports on public.reports for select to authenticated using(reporter_id=(select auth.uid()) or private.is_staff());
create policy moderate_reports on public.reports for update to authenticated using(private.is_staff()) with check(private.is_staff());
alter table public.gatherings enable row level security;
create policy published_gatherings on public.gatherings for select to authenticated using(status='published' or private.is_staff());
create policy staff_gatherings on public.gatherings for all to authenticated using(private.is_staff()) with check(private.is_staff());
alter table public.memberships enable row level security;
create policy own_or_host_membership on public.memberships for select to authenticated using(user_id=(select auth.uid()) or private.is_staff() or exists(select 1 from public.gatherings g where g.id=gathering_id and g.host_id=(select auth.uid())));
create policy host_speakers on public.memberships for update to authenticated using(private.is_staff() or exists(select 1 from public.gatherings g where g.id=gathering_id and g.host_id=(select auth.uid()))) with check(private.is_staff() or exists(select 1 from public.gatherings g where g.id=gathering_id and g.host_id=(select auth.uid())));
alter table public.series_interest enable row level security;
create policy own_interest on public.series_interest for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
alter table public.devices enable row level security;
create policy own_devices on public.devices for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
alter table public.backups enable row level security;
create policy own_backups on public.backups for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function public.post_comment(p_item text,p_alias text,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin
 if not private.can_participate() then raise exception 'not_allowed'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 if not exists(select 1 from public.content_items where id=p_item and published and kind='feed') then raise exception 'not_found';end if;
 if (select count(*) from public.comments where user_id=auth.uid() and created_at>now()-interval '1 minute')>=5 then raise exception 'rate_limited';end if;
 insert into public.comments(item_id,user_id,alias,body) values(p_item,auth.uid(),trim(p_alias),trim(p_body)) returning id into result;return result;
end;$$;
create function public.report_content(p_item text,p_comment uuid,p_reason text,p_detail text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin
 if auth.uid() is null then raise exception 'unauthorized';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,2));
 if (select count(*) from public.reports where reporter_id=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception 'rate_limited';end if;
 if p_comment is not null and not exists(select 1 from public.comments where id=p_comment and (status='approved' or user_id=auth.uid())) then raise exception 'not_found';end if;
 insert into public.reports(reporter_id,item_id,comment_id,reason,detail) values(auth.uid(),p_item,p_comment,p_reason,trim(p_detail)) returning id into result;return result;
end;$$;
create function public.feed_stats() returns table(item_id text,likes bigint,comments bigint) language sql stable security definer set search_path='' as $$
 select c.id,(select count(*) from public.likes l where l.item_id=c.id),(select count(*) from public.comments m where m.item_id=c.id and m.status='approved' and not exists(select 1 from public.blocks b where b.user_id=auth.uid() and b.blocked_user_id=m.user_id)) from public.content_items c where c.published and c.kind='feed';$$;
create function public.rsvp(p_gathering uuid,p_join boolean) returns void language plpgsql security definer set search_path='' as $$
declare g public.gatherings;begin
 if not private.can_participate() then raise exception 'not_allowed';end if;
 select * into g from public.gatherings where id=p_gathering for update;
 if not p_join then delete from public.memberships where gathering_id=p_gathering and user_id=auth.uid();return;end if;
 if g.id is null or g.status<>'published' or g.ends_at<now() then raise exception 'unavailable';end if;
 if exists(select 1 from public.memberships where gathering_id=g.id and user_id=auth.uid()) then return;end if;
 if (select count(*) from public.memberships where gathering_id=g.id)>=g.capacity then raise exception 'full';end if;
 insert into public.memberships(gathering_id,user_id) values(g.id,auth.uid());
end;$$;
create function public.raise_hand(p_gathering uuid,p_raised boolean) returns void language sql security definer set search_path='' as $$update public.memberships set hand_raised=p_raised where gathering_id=p_gathering and user_id=auth.uid();$$;
create function public.staff_role() returns text language sql stable security definer set search_path='' as $$select role from private.staff where user_id=auth.uid();$$;
revoke all on function public.post_comment(text,text,text),public.report_content(text,uuid,text,text),public.feed_stats(),public.rsvp(uuid,boolean),public.raise_hand(uuid,boolean),public.staff_role() from public,anon;
grant execute on function public.post_comment(text,text,text),public.report_content(text,uuid,text,text),public.feed_stats(),public.rsvp(uuid,boolean),public.raise_hand(uuid,boolean),public.staff_role() to authenticated;
