-- Operational abuse protection only; this is not a subscription allowance.
-- No message text or translated content is stored here.
create table private.translation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket timestamptz not null,
  requests integer not null default 0,
  primary key (user_id, bucket)
);
alter table private.translation_usage enable row level security;
create index translation_usage_bucket on private.translation_usage(bucket);
revoke all on private.translation_usage from public, anon, authenticated;

create function public.reserve_translation(p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  current_bucket timestamptz := date_trunc('minute', clock_timestamp());
  recent integer;
begin
  if p_user is null or not exists(select 1 from auth.users where id = p_user) then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 75589));
  delete from private.translation_usage where bucket < current_bucket - interval '2 days';
  select coalesce(sum(requests), 0) into recent from private.translation_usage
    where user_id = p_user and bucket >= current_bucket - interval '1 day';
  if recent >= 2000 or coalesce((select requests from private.translation_usage where user_id = p_user and bucket = current_bucket), 0) >= 60 then return false; end if;
  insert into private.translation_usage(user_id, bucket, requests) values(p_user, current_bucket, 1)
    on conflict(user_id, bucket) do update set requests = private.translation_usage.requests + 1;
  return true;
end $$;
revoke all on function public.reserve_translation(uuid) from public, anon, authenticated;
grant execute on function public.reserve_translation(uuid) to service_role;
