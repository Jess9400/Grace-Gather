-- Run inside an isolated test database with synthetic records only.
begin;
do $$ begin
  if has_function_privilege('anon','public.rejected_moderation_items(integer)','execute') then raise exception 'anonymous history access'; end if;
  if has_function_privilege('authenticated','public.confession_moderate_once(text,text,uuid,text,text)','execute') then raise exception 'moderation bypass'; end if;
end $$;
insert into public.confessions(id,kind,author,body,theme,status,created)
 values ('test-case','confession','22222222-2222-4222-8222-222222222222','Synthetic text','Test','pending',1000);
do $$ begin
  if not public.confession_moderate_once('test-case','rejected','11111111-1111-4111-8111-111111111111','Test reason','pending') then raise exception 'first review failed'; end if;
  if public.confession_moderate_once('test-case','approved','33333333-3333-4333-8333-333333333333','Test reason','pending') then raise exception 'stale decision succeeded'; end if;
  if (select status from public.confessions where id='test-case') <> 'rejected' then raise exception 'decision overwritten'; end if;
  if (select count(*) from public.confession_audit where target='test-case') <> 1 then raise exception 'unexpected audit entries'; end if;
end $$;
insert into public.confessions(id,kind,author,body,theme,status,created)
 values ('self-case','confession','11111111-1111-4111-8111-111111111111','Synthetic','Test','pending',1000);
do $$ begin
  if public.confession_moderate_once('self-case','approved','11111111-1111-4111-8111-111111111111','Test reason','pending') then raise exception 'self review allowed'; end if;
end $$;
select set_config('test.uid','11111111-1111-4111-8111-111111111111',true);
insert into public.community_posts(id,author,body,status,created_at)
 values ('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','Synthetic discussion','pending',now());
select public.community_review('44444444-4444-4444-8444-444444444444',true);
do $$ begin
  begin perform public.community_review('44444444-4444-4444-8444-444444444444',false); raise exception 'stale discussion decision succeeded';
  exception when raise_exception then if sqlerrm <> 'already_reviewed' then raise; end if; end;
end $$;
do $$ declare items jsonb; begin
  items:=public.rejected_moderation_items(0);
  if jsonb_array_length(items) <> 1 or items->0->>'body' <> 'Synthetic text' then raise exception 'staff history missing rejected item'; end if;
end $$;
delete from public.confessions where id='test-case';
do $$ begin if jsonb_array_length(public.rejected_moderation_items(0)) <> 0 then raise exception 'deleted item retained'; end if; end $$;
insert into public.community_posts(id,body,status,created_at) values ('50000000-0000-4000-8000-000000000001','Discussion','removed',now());
insert into private.testimonies(id,body,title,status,created_at,rejection_reason) values ('50000000-0000-4000-8000-000000000002','Testimony','Title','rejected',now(),'Reason');
insert into private.prayer_requests(id,reason,theme,status,created_at,review_reason) values ('50000000-0000-4000-8000-000000000003','Prayer','Theme','rejected',now(),'Reason');
insert into public.comments(id,body,status,created_at) values ('50000000-0000-4000-8000-000000000004','Comment','removed',now());
insert into public.pay_forward_submissions(id,body,title,status,created_at,reason) values ('50000000-0000-4000-8000-000000000005','Giving','Title','rejected',now(),'Reason');
do $$ begin
  if jsonb_array_length(public.rejected_moderation_items(0)) <> 5 then raise exception 'missing rejected categories'; end if;
end $$;
select set_config('test.uid','33333333-3333-4333-8333-333333333333',true);
do $$ begin
  begin perform public.rejected_moderation_items(0); raise exception 'non-staff could read history';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
