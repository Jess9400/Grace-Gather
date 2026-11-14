begin;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
insert into private.friend_links values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','accepted');
insert into private.friend_messages values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','private message');
insert into public.community_posts values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',null,'subject','public post','approved');
insert into public.content_items values ('story',true);
insert into public.comments values ('40000000-0000-0000-0000-000000000001','story','00000000-0000-0000-0000-000000000002','comment','approved');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
 if public.ai_community_permission() then raise exception 'permission defaults on'; end if;
 if public.ai_journal_permission() then raise exception 'journal permission defaults on'; end if;
 perform public.set_ai_journal_permission(true,'00000000-0000-0000-0000-000000000001');
 if not public.ai_journal_permission() then raise exception 'journal permission not saved'; end if;
 begin
   perform public.set_ai_journal_permission(true,'00000000-0000-0000-0000-000000000002');
   raise exception 'wrong-account journal consent accepted';
 exception when raise_exception then
   if sqlerrm <> 'not_allowed' then raise; end if;
 end;
 if public.ai_translation_sources('[{"source":"friend_message","id":"20000000-0000-0000-0000-000000000001"}]') <> '[]' then raise exception 'viewer did not agree'; end if;
 begin
   perform public.set_ai_community_permission(true,'00000000-0000-0000-0000-000000000002');
   raise exception 'wrong-account consent was accepted';
 exception when raise_exception then
   if sqlerrm <> 'not_allowed' then raise; end if;
 end;
 perform public.set_ai_community_permission(true,'00000000-0000-0000-0000-000000000001');
 if public.ai_translation_sources('[{"source":"friend_message","id":"20000000-0000-0000-0000-000000000001"}]') <> '[]' then raise exception 'author did not agree'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin if public.ai_journal_permission() then raise exception 'another account inherited journal consent'; end if; end $$;
select public.set_ai_community_permission(true,'00000000-0000-0000-0000-000000000002');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ declare result jsonb; begin
 result := public.ai_translation_sources('[{"source":"friend_message","id":"20000000-0000-0000-0000-000000000001"},{"source":"community_title","id":"30000000-0000-0000-0000-000000000001"},{"source":"comment","id":"40000000-0000-0000-0000-000000000001"}]');
 if jsonb_array_length(result) <> 3 then raise exception 'authorized content missing'; end if;
 if result->0->>'text' <> 'private message' then raise exception 'wrong content'; end if;
 if public.ai_translation_sources('[{"source":"friend_message","id":"not-a-uuid","text":"untrusted"}]') <> '[]' then raise exception 'caller supplied text accepted'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.set_ai_community_permission(true,'00000000-0000-0000-0000-000000000003');
do $$ begin
 if public.ai_translation_sources('[{"source":"friend_message","id":"20000000-0000-0000-0000-000000000001"}]') <> '[]' then raise exception 'third party can read private message'; end if;
end $$;
reset role;
insert into private.friend_blocks values ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
 if public.ai_translation_sources('[{"source":"friend_message","id":"20000000-0000-0000-0000-000000000001"}]') <> '[]' then raise exception 'blocked friendship leaked'; end if;
end $$;
reset role;
delete from private.friend_blocks;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.set_ai_community_permission(false,'00000000-0000-0000-0000-000000000002');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
 if public.ai_translation_sources('[{"source":"friend_message","id":"20000000-0000-0000-0000-000000000001"}]') <> '[]' then raise exception 'withdrawal ignored'; end if;
end $$;
rollback;
