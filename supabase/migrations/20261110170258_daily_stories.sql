-- External devotional links only. Publisher text is not copied, and existing
-- community testimonies and editorial stories remain unchanged.
create table private.featured_story_links (
  url text primary key,
  item_id text not null unique references public.content_items(id),
  featured_on date not null unique,
  created_at timestamptz not null default now()
);
alter table private.featured_story_links enable row level security;
revoke all on private.featured_story_links from public, anon, authenticated;

-- The scheduler calls a public trigger with no request-controlled content. A
-- service-only database lease limits publisher requests and concurrent work.
create table private.story_job_state (
  singleton boolean primary key default true check (singleton),
  last_attempt timestamptz,
  lease_until timestamptz
);
insert into private.story_job_state(singleton) values (true);
alter table private.story_job_state enable row level security;
revoke all on private.story_job_state from public,anon,authenticated;

create function public.story_import_claim() returns boolean
language plpgsql security definer set search_path='' as $$
declare claimed boolean;
begin
 update private.story_job_state set last_attempt=now(),lease_until=now()+interval '3 minutes'
 where singleton and (lease_until is null or lease_until<now())
   and (last_attempt is null or last_attempt<now()-interval '50 minutes')
   and not exists(select 1 from private.featured_story_links where featured_on=(now() at time zone 'UTC')::date)
 returning true into claimed;
 return coalesce(claimed,false);
end $$;
revoke all on function public.story_import_claim() from public,anon,authenticated;
grant execute on function public.story_import_claim() to service_role;

create function public.story_import_unseen(p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>1000 then raise exception 'invalid_catalog'; end if;
 return (select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) from (
   select value,ord from jsonb_array_elements(p_items) with ordinality i(value,ord)
   where not exists(select 1 from private.featured_story_links f where f.url=i.value->>'url') order by ord limit 5
 ) candidates);
end $$;
revoke all on function public.story_import_unseen(jsonb) from public, anon, authenticated;
grant execute on function public.story_import_unseen(jsonb) to service_role;

create function public.story_import_daily(p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item jsonb; story_url text; story_title text; story_id text; today date := (now() at time zone 'UTC')::date;
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>1000 then raise exception 'invalid_catalog'; end if;
 perform pg_advisory_xact_lock(hashtext('grace-featured-story'));
 if exists(select 1 from private.featured_story_links where featured_on=today) then return jsonb_build_object('status','already_featured'); end if;
 for item in select value from jsonb_array_elements(p_items) loop
  story_url:=item->>'url'; story_title:=btrim(item->>'title');
  if story_url !~ '^https://christianfaithstories[.]org/wp-content/uploads/[0-9]{4}/[0-9]{2}/[a-zA-Z0-9%._-]+[.]pdf$' or length(story_title) not between 5 and 120 or story_title ~ '[<>[:cntrl:]]' then continue; end if;
  if exists(select 1 from private.featured_story_links where url=story_url) then continue; end if;
  story_id:='publisher-'||md5(story_url);
  insert into public.content_items(id,kind,published,sort_at,data) values(story_id,'feed',true,now(),jsonb_build_object(
   'id',story_id,'type','devotional','origin','publisher','title',jsonb_build_object('en',story_title),
   'summary',jsonb_build_object('en','A devotional story by Bruce Boyer, shared by Christian Faith Stories.'),
   'body',jsonb_build_object('en','Read the complete story at Christian Faith Stories.'),
   'source','Christian Faith Stories','author','Bruce Boyer','url',story_url,'lang','en',
   'resources',jsonb_build_array(jsonb_build_array('read','Read the complete story (PDF)',story_url))));
  insert into private.featured_story_links(url,item_id,featured_on) values(story_url,story_id,today);
  return jsonb_build_object('status','featured','id',story_id);
 end loop;
 return jsonb_build_object('status','no_unfeatured_stories');
end $$;
revoke all on function public.story_import_daily(jsonb) from public, anon, authenticated;
grant execute on function public.story_import_daily(jsonb) to service_role;

-- The project URL is configured separately in Vault for each deployment.
-- Hourly retries make one successful feature per UTC day; the transaction
-- above prevents duplicates if multiple invocations overlap.
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') and exists(select 1 from pg_extension where extname='pg_net') then
  perform cron.schedule('grace-daily-stories','10 * * * *',
   $job$select net.http_post(
     url:=(select decrypted_secret from vault.decrypted_secrets where name='daily_story_project_url') || '/functions/v1/daily-stories',
     headers:=jsonb_build_object('Content-Type','application/json'),
     body:='{}'::jsonb,timeout_milliseconds:=45000
   );$job$);
 end if;
end $$;
