-- Bible Study progress follows the account across phones and the web:
-- reading-plan days (one record per Bible edition) and today's devotional
-- steps. Only the owner can read or write their own records.
create table if not exists private.study_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 scope text not null check(scope ~ '^[a-z0-9_-]{1,40}$'),
 state jsonb not null check(jsonb_typeof(state)='object' and octet_length(state::text)<=20000),
 updated_at timestamptz not null default now(),
 primary key(user_id,scope)
);
alter table private.study_progress enable row level security;
revoke all on private.study_progress from public,anon,authenticated;

create or replace function private.study_progress(p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); s text:=coalesce(p_data->>'scope',''); st jsonb:=p_data->'state'; found_row private.study_progress;
begin
 if u is null or not exists(select 1 from auth.users where id=u and (email_confirmed_at is not null or phone_confirmed_at is not null)) then raise exception 'sign_in_required'; end if;
 if s !~ '^[a-z0-9_-]{1,40}$' then raise exception 'invalid_input'; end if;
 if p_action='get' then
  select * into found_row from private.study_progress where user_id=u and scope=s;
  return case when found_row.user_id is null then 'null'::jsonb
   else jsonb_build_object('state',found_row.state,'updated_at',found_row.updated_at) end;
 elsif p_action='save' then
  if st is null or jsonb_typeof(st)<>'object' or octet_length(st::text)>20000 then raise exception 'invalid_input'; end if;
  insert into private.study_progress(user_id,scope,state) values(u,s,st)
  on conflict(user_id,scope) do update set state=excluded.state,updated_at=now();
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'invalid_action';
end $$;
revoke all on function private.study_progress(text,jsonb) from public,anon,authenticated;
grant execute on function private.study_progress(text,jsonb) to authenticated;
create or replace function public.study_progress(p_action text,p_data jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$select private.study_progress(p_action,p_data);$$;
revoke all on function public.study_progress(text,jsonb) from public,anon;
grant execute on function public.study_progress(text,jsonb) to authenticated;
