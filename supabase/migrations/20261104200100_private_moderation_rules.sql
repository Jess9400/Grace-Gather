-- This agent uses only existing Postgres resources. No model, HTTP request,
-- arbitrary instruction execution, or additional processor is involved.
create function private.community_rule_key(value text) returns text language sql immutable set search_path='' as $$
 select lower(regexp_replace(trim(coalesce(value,'')), '[[:space:]]+', ' ', 'g'));
$$;
create function private.community_rule_enabled() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select active from private.community_rule_config where singleton),false);
$$;
create function private.community_canonical_link() returns trigger language plpgsql security definer set search_path='' as $$
declare book jsonb; parts text[];
begin
 if not private.community_rule_enabled() or new.verse_id is null then return new;end if;
 parts:=regexp_match(new.verse_id,'^(web|dra|brenton):([A-Z0-9]{3})\.([1-9][0-9]{0,2})\.([1-9][0-9]{0,2})$');
 select b into book from private.community_rule_config c,jsonb_array_elements(c.books->parts[1]) b where b->>'code'=parts[2];
 if book is null or not exists(select 1 from jsonb_array_elements_text(book->'verses'->parts[3]) v where v=parts[4]) then raise exception 'invalid_verse';end if;
 -- Public reference text is derived, never supplied as an unchecked extra field.
 new.reference:=(book->>'name')||' '||parts[3]||':'||parts[4];
 return new;
end;$$;
create trigger community_canonical_link before insert on public.community_posts for each row execute function private.community_canonical_link();

create function private.community_apply_rules(p_post uuid) returns text language plpgsql security definer set search_path='' as $$
declare p public.community_posts; rules jsonb; allowed boolean; reason text;
begin
 if not private.community_rule_enabled() then return 'pending';end if;
 select * into p from public.community_posts where id=p_post for update;
 if p.id is null then return 'unchanged';end if;
 if p.status='approved' then return 'approved';end if;
 if p.status<>'pending' or p.reviewed_at is not null then return 'held';end if;
 select policy into rules from private.community_rule_config where singleton;
 allowed:=exists(select 1 from auth.users where id=p.author and email_confirmed_at is not null)
  and not exists(select 1 from private.suspensions where user_id=p.author)
  and exists(select 1 from jsonb_array_elements_text(rules->'aliases') v where private.community_rule_key(v)=private.community_rule_key(p.alias))
  and exists(select 1 from jsonb_array_elements_text(rules->'messages') v where private.community_rule_key(v)=private.community_rule_key(p.body))
  and ((p.parent is null and exists(select 1 from jsonb_array_elements_text(rules->'titles') v where private.community_rule_key(v)=private.community_rule_key(p.title)))
   or (p.parent is not null and exists(select 1 from public.community_posts where id=p.parent and status='approved')));
 reason:=case when allowed then 'Matches the limited private publication rules.' else 'Outside the limited private publication rules. Held without a safety or theological judgment.' end;
 update public.community_posts set status=case when allowed then 'approved' else 'pending' end,reviewed_at=clock_timestamp() where id=p.id;
 insert into private.community_screening(post_id,flags,summary) values(p.id,case when allowed then array[]::text[] else array['needs_context']::text[] end,reason)
 on conflict(post_id) do update set flags=excluded.flags,summary=excluded.summary,created_at=clock_timestamp();
 insert into private.community_audit(actor,post_id,action) values(p.author,p.id,case when allowed then 'auto_publish' else 'auto_hold' end);
 return case when allowed then 'approved' else 'held' end;
end;$$;
create function private.community_after_submission() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.community_apply_rules(new.id);
 return new;
end;$$;
create trigger community_private_review after insert on public.community_posts for each row execute function private.community_after_submission();

create function private.community_after_report() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not private.community_rule_enabled() or new.resolved then return new;end if;
 update public.community_posts set status='pending',reviewed_at=clock_timestamp() where id=new.post_id and status='approved';
 if found then
  insert into private.community_screening(post_id,flags,summary) values(new.post_id,array['needs_context'],'Reported by a member. Held until a review process is available.')
  on conflict(post_id) do update set flags=excluded.flags,summary=excluded.summary,created_at=clock_timestamp();
  insert into private.community_audit(actor,post_id,action) values(new.reporter,new.post_id,'auto_hold');
 end if;
 return new;
end;$$;
create trigger community_private_report after insert or update on public.community_reports for each row execute function private.community_after_report();

create function public.community_moderation_status() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'unauthorized';end if;
 return jsonb_build_object('active',private.community_rule_enabled(),'mode','private_rules','version',1,'externalProcessing',false);
end;$$;
create function public.community_check_private(p_post uuid) returns text language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'unauthorized';end if;
 if not exists(select 1 from public.community_posts p where p.id=p_post and (p.author=auth.uid() or private.community_moderator() or exists(select 1 from public.community_reports r where r.post_id=p.id and r.reporter=auth.uid()))) then raise exception 'not_found';end if;
 return private.community_apply_rules(p_post);
end;$$;
revoke all on function private.community_rule_key(text),private.community_rule_enabled(),private.community_canonical_link(),private.community_apply_rules(uuid),private.community_after_submission(),private.community_after_report() from public,anon,authenticated,service_role;
revoke all on function public.community_moderation_status(),public.community_check_private(uuid) from public,anon,authenticated;
grant execute on function public.community_moderation_status(),public.community_check_private(uuid) to authenticated;
