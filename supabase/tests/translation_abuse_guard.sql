begin;
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000001');
do $$
declare i integer;
begin
  if has_function_privilege('authenticated', 'public.reserve_translation(uuid)', 'execute')
     or has_function_privilege('anon', 'public.reserve_translation(uuid)', 'execute') then
    raise exception 'Translation reservation must not be callable by app clients';
  end if;
  if not has_function_privilege('service_role', 'public.reserve_translation(uuid)', 'execute') then
    raise exception 'Translation service needs permission to reserve';
  end if;
  if public.reserve_translation('00000000-0000-0000-0000-000000000002') then
    raise exception 'Unknown users must not be able to reserve';
  end if;
  for i in 1..60 loop
    if not public.reserve_translation('00000000-0000-0000-0000-000000000001') then
      raise exception 'Valid reservation % unexpectedly failed', i;
    end if;
  end loop;
  if public.reserve_translation('00000000-0000-0000-0000-000000000001') then
    raise exception 'Burst protection did not engage';
  end if;
end $$;
rollback;
