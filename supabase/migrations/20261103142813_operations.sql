-- Server-only operations are exposed as narrowly scoped RPCs, never as readable private tables.
grant select on public.gatherings to anon;
create policy public_schedule on public.gatherings for select to anon using(status='published');
create table private.gathering_bans(gathering_id uuid references public.gatherings(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,primary key(gathering_id,user_id));
alter table private.gathering_bans enable row level security;
create function public.participation_allowed() returns boolean language sql stable security definer set search_path='' as $$select private.can_participate();$$;
revoke all on function public.participation_allowed() from public,anon;
grant execute on function public.participation_allowed() to authenticated;
create function public.store_apple_token(p_user uuid,p_token text) returns void language sql security definer set search_path='' as $$insert into private.apple_tokens(user_id,encrypted_token) values(p_user,p_token) on conflict(user_id) do update set encrypted_token=excluded.encrypted_token;$$;
create function public.read_apple_token(p_user uuid) returns text language sql security definer set search_path='' as $$select encrypted_token from private.apple_tokens where user_id=p_user;$$;
create function public.ban_from_gathering(p_gathering uuid,p_user uuid) returns void language sql security definer set search_path='' as $$insert into private.gathering_bans values(p_gathering,p_user) on conflict do nothing;$$;
create function public.is_gathering_banned(p_gathering uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.gathering_bans where gathering_id=p_gathering and user_id=p_user);$$;
create function public.moderate_user(p_user uuid,p_suspend boolean,p_reason text default '') returns void language plpgsql security definer set search_path='' as $$begin
 if not private.is_staff() then raise exception 'not_allowed';end if;
 if exists(select 1 from private.staff where user_id=p_user) then raise exception 'staff_protected';end if;
 if p_suspend then insert into private.suspensions(user_id,reason) values(p_user,left(p_reason,1000)) on conflict(user_id) do update set reason=excluded.reason;update public.comments set status='removed' where user_id=p_user;else delete from private.suspensions where user_id=p_user;end if;
end;$$;
revoke all on function public.moderate_user(uuid,boolean,text) from public,anon;
grant execute on function public.moderate_user(uuid,boolean,text) to authenticated;
-- A banned participant cannot reserve a place again.
create or replace function public.rsvp(p_gathering uuid,p_join boolean) returns void language plpgsql security definer set search_path='' as $$
declare g public.gatherings;begin
 if not private.can_participate() then raise exception 'not_allowed';end if;
 select * into g from public.gatherings where id=p_gathering for update;
 if not p_join then delete from public.memberships where gathering_id=p_gathering and user_id=auth.uid();return;end if;
 if g.id is null or g.status<>'published' or g.ends_at<=now() or g.host_id is null then raise exception 'unavailable';end if;
 if exists(select 1 from private.gathering_bans where gathering_id=g.id and user_id=auth.uid()) then raise exception 'not_allowed';end if;
 if exists(select 1 from public.memberships where gathering_id=g.id and user_id=auth.uid()) then return;end if;
 if (select count(*) from public.memberships where gathering_id=g.id)>=g.capacity then raise exception 'full';end if;
 insert into public.memberships(gathering_id,user_id) values(g.id,auth.uid());
end;$$;
create function public.queue_gathering_reminders() returns void language sql security definer set search_path='' as $$
 insert into private.delivery_jobs(user_id,channel,kind,subject,body,due_at,unique_key)
 select m.user_id,channel,'gathering','Away Church','Your gathering starts in one hour. Open Away Church for details.',g.starts_at-interval '1 hour',g.id::text||':'||g.starts_at::text||':'||m.user_id::text||':'||channel
 from public.memberships m join public.gatherings g on g.id=m.gathering_id cross join (values('email'),('push')) as ch(channel)
 where g.status='published' and g.starts_at>now() and g.starts_at<now()+interval '25 hours'
 on conflict(unique_key) do nothing;
$$;
create function public.claim_delivery_jobs() returns setof private.delivery_jobs language sql security definer set search_path='' as $$
 update private.delivery_jobs set state='sending',locked_until=now()+interval '3 minutes',attempts=attempts+1
 where id in (select id from private.delivery_jobs where due_at<=now() and due_at>now()-interval '1 hour' and attempts<3 and (state='pending' or state='sending' and locked_until<now()) order by due_at for update skip locked limit 20) returning *;
$$;
create function public.delivery_target(p_job uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('email',case when p.email_consent and lower(p.notification_email)=lower(u.email) and u.email_confirmed_at is not null then u.email else null end,'tokens',(select coalesce(jsonb_agg(d.token),'[]'::jsonb) from public.devices d where d.user_id=u.id and enabled))
 from private.delivery_jobs j join auth.users u on u.id=j.user_id left join public.profiles p on p.id=u.id
 where j.id=p_job and exists(select 1 from public.memberships m join public.gatherings g on g.id=m.gathering_id where m.user_id=j.user_id and g.status='published' and g.starts_at>now() and j.unique_key like g.id::text||':'||g.starts_at::text||':%');
$$;
create function public.finish_delivery_job(p_job uuid,p_state text) returns void language sql security definer set search_path='' as $$update private.delivery_jobs set state=p_state,locked_until=null where id=p_job and p_state in ('sent','failed','cancelled');$$;
revoke all on function public.store_apple_token(uuid,text),public.read_apple_token(uuid),public.ban_from_gathering(uuid,uuid),public.is_gathering_banned(uuid,uuid),public.queue_gathering_reminders(),public.claim_delivery_jobs(),public.delivery_target(uuid),public.finish_delivery_job(uuid,text) from public,anon,authenticated;
grant execute on function public.store_apple_token(uuid,text),public.read_apple_token(uuid),public.ban_from_gathering(uuid,uuid),public.is_gathering_banned(uuid,uuid),public.queue_gathering_reminders(),public.claim_delivery_jobs(),public.delivery_target(uuid),public.finish_delivery_job(uuid,text) to service_role;
