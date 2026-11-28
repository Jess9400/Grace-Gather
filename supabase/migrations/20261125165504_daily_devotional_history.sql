-- Reading history is account-owned. Editorial text lives in versioned assets;
-- this table records no journal text and is never directly exposed to clients.
create table if not exists private.devotional_history (
 user_id uuid not null references auth.users(id) on delete cascade,
 devotional_id text not null check(devotional_id ~ '^gg-year1-d(00[1-9]|0[1-9][0-9]|[12][0-9]{2}|3[0-5][0-9]|36[0-5])$'),
 first_seen_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 completed_at timestamptz,
 steps smallint not null default 0 check(steps between 0 and 15),
 primary key(user_id,devotional_id)
);
alter table private.devotional_history enable row level security;
revoke all on private.devotional_history from public,anon,authenticated;
create or replace function private.devotional_history(p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d text:=p_data->>'id'; bits integer:=coalesce((p_data->>'steps')::integer,0); r private.devotional_history;
begin
 if u is null or not exists(select 1 from auth.users where id=u and (email_confirmed_at is not null or phone_confirmed_at is not null)) then raise exception 'sign_in_required'; end if;
 if p_action='list' then
  return coalesce((select jsonb_agg(jsonb_build_object('id',devotional_id,'seenAt',first_seen_at,'completedAt',completed_at,'steps',steps) order by devotional_id) from private.devotional_history where user_id=u),'[]'::jsonb);
 elsif p_action='record' then
  if d is null or d !~ '^gg-year1-d(00[1-9]|0[1-9][0-9]|[12][0-9]{2}|3[0-5][0-9]|36[0-5])$' or bits not between 0 and 15 then raise exception 'invalid_input'; end if;
  insert into private.devotional_history(user_id,devotional_id,steps,completed_at)
   values(u,d,bits,case when bits=15 then now() else null end)
   on conflict(user_id,devotional_id) do update set
    last_seen_at=now(),steps=private.devotional_history.steps|excluded.steps,
    completed_at=coalesce(private.devotional_history.completed_at,case when (private.devotional_history.steps|excluded.steps)=15 then now() else null end)
   returning * into r;
  return jsonb_build_object('id',r.devotional_id,'seenAt',r.first_seen_at,'completedAt',r.completed_at,'steps',r.steps);
 end if;
 raise exception 'invalid_action';
end $$;
revoke all on function private.devotional_history(text,jsonb) from public,anon,authenticated;
grant execute on function private.devotional_history(text,jsonb) to authenticated;
create or replace function public.devotional_history(p_action text,p_data jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$select private.devotional_history(p_action,p_data);$$;
revoke all on function public.devotional_history(text,jsonb) from public,anon;
grant execute on function public.devotional_history(text,jsonb) to authenticated;
