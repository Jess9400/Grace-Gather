-- Match the participation guard used by the other community submissions.
create or replace function public.pay_forward_submit(p_title text,p_body text,p_location text,p_website text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; uid uuid:=auth.uid();
begin
 if uid is null or not private.can_participate() then raise exception 'sign_in_required'; end if;
 perform pg_advisory_xact_lock(hashtext(uid::text));
 if (select count(*) from public.pay_forward_submissions where owner_id=uid and created_at>now()-interval '1 day')>=5 then raise exception 'daily_limit'; end if;
 insert into public.pay_forward_submissions(owner_id,title,body,location,website) values(uid,trim(p_title),trim(p_body),trim(p_location),trim(p_website)) returning id into result;
 return result;
end $$;
