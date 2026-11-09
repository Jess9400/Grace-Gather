-- New submissions must remain pending until Qwen returns an explicit safe decision.
-- Keep canonical verse validation and all staff/manual review permissions intact.
drop trigger if exists community_private_review on public.community_posts;
-- Older clients cannot use the former allow-list endpoint to bypass screening.
create or replace function public.community_check_private(p_post uuid) returns text
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'unauthorized';end if;
 if not exists(select 1 from public.community_posts p where p.id=p_post and
 (p.author=auth.uid() or private.community_moderator())) then raise exception 'not_found';end if;
 return (select status::text from public.community_posts where id=p_post);
end;$$;
