-- Run in a disposable database with study_notebook_bootstrap.sql, then the
-- progress and devotional migrations. Never run these fixtures in production.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.devotional_history('record','{"id":"gg-year1-d001","steps":1}');
select public.devotional_history('record','{"id":"gg-year1-d001","steps":2}');
do $$begin
 if (public.devotional_history('list')->0->>'steps')::integer<>3 then raise exception 'concurrent steps lost';end if;
 if public.devotional_history('list')->0->>'completedAt' is not null then raise exception 'premature completion';end if;
end$$;
select public.devotional_history('record','{"id":"gg-year1-d001","steps":12}');
do $$begin
 if public.devotional_history('list')->0->>'completedAt' is null then raise exception 'completion missing';end if;
 if (public.devotional_history('list')->0->>'steps')::integer<>15 then raise exception 'steps missing';end if;
end$$;
select public.devotional_history('record','{"id":"gg-year1-d001","steps":0}');
do $$begin
 if (public.devotional_history('list')->0->>'steps')::integer<>15 then raise exception 'view erased progress';end if;
 begin perform public.devotional_history('record','{"id":"gg-year1-d366","steps":1}');raise exception 'invalid accepted'; exception when others then if sqlerrm='invalid accepted' then raise;end if;end;
 if has_table_privilege('authenticated','private.devotional_history','select') then raise exception 'direct read';end if;
 if has_function_privilege('anon','public.devotional_history(text,jsonb)','execute') then raise exception 'anonymous access';end if;
end$$;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
do $$begin if public.devotional_history('list')<>'[]'::jsonb then raise exception 'other account sees history';end if;end$$;
select public.devotional_history('record','{"id":"gg-year1-d002","steps":15}');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$begin if jsonb_array_length(public.devotional_history('list'))<>1 then raise exception 'cross account write';end if;end$$;
rollback;
