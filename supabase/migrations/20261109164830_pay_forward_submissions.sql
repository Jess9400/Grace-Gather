-- Member recommendations are not endorsements. Only staff-reviewed items are public.
create table public.pay_forward_submissions (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(trim(title)) between 3 and 120),
 body text not null check(length(trim(body)) between 20 and 4000),
 location text not null default '' check(length(location)<=160),
 website text not null default '' check(website='' or (website ~ '^https://' and length(website)<=500)),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reason text not null default '' check(length(reason)<=1000),
 created_at timestamptz not null default now()
);
create index pay_forward_owner on public.pay_forward_submissions(owner_id,created_at desc);
create index pay_forward_status on public.pay_forward_submissions(status,created_at desc);
alter table public.pay_forward_submissions enable row level security;
revoke all on public.pay_forward_submissions from anon,authenticated;
grant select,delete on public.pay_forward_submissions to authenticated;
create policy pay_forward_owner_read on public.pay_forward_submissions for select to authenticated using(owner_id=(select auth.uid()) or (select public.staff_role()) in ('admin','moderator'));
create policy pay_forward_owner_delete on public.pay_forward_submissions for delete to authenticated using(owner_id=(select auth.uid()));
create function public.pay_forward_submit(p_title text,p_body text,p_location text,p_website text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'sign_in_required'; end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if (select count(*) from public.pay_forward_submissions where owner_id=uid and created_at>now()-interval '1 day')>=5 then raise exception 'daily_limit'; end if;
 insert into public.pay_forward_submissions(owner_id,title,body,location,website) values(uid,trim(p_title),trim(p_body),trim(p_location),trim(p_website)) returning id into result;
 return result;
end $$;
create function public.pay_forward_list(p_offset integer default 0) returns table(id uuid,title text,body text,location text,website text) language sql stable security definer set search_path='' as $$
 select id,title,body,location,website from public.pay_forward_submissions where status='approved' and auth.uid() is not null order by created_at desc,id limit 20 offset greatest(0,least(p_offset,100000));
$$;
create function public.pay_forward_review(p_id uuid,p_approve boolean,p_reason text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if coalesce(public.staff_role(),'') not in ('admin','moderator') then raise exception 'staff_required'; end if;
 if not p_approve and length(trim(p_reason))=0 then raise exception 'reason_required'; end if;
 update public.pay_forward_submissions set status=case when p_approve then 'approved' else 'rejected' end,reason=case when p_approve then '' else trim(p_reason) end where id=p_id and status='pending';
 if not found then raise exception 'not_pending'; end if;
end $$;
revoke all on function public.pay_forward_submit(text,text,text,text), public.pay_forward_list(integer),public.pay_forward_review(uuid,boolean,text) from public,anon;
grant execute on function public.pay_forward_submit(text,text,text,text), public.pay_forward_list(integer),public.pay_forward_review(uuid,boolean,text) to authenticated;
