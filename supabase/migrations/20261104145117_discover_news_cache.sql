create table private.news_sources(id text primary key,name text not null,url text not null,license text not null,license_url text not null,enabled boolean not null default true,last_attempt timestamptz,last_success timestamptz,error text,lease_until timestamptz);
alter table private.news_sources enable row level security;
create table private.news_imports(id text primary key references public.content_items(id) on delete cascade,canonical_url text not null unique,fingerprint text not null unique,source_id text references private.news_sources(id),first_seen timestamptz not null default now());
alter table private.news_imports enable row level security;
create table private.news_failures(id bigint generated always as identity primary key,source_id text,code text,created_at timestamptz not null default now());
alter table private.news_failures enable row level security;
insert into private.news_sources(id,name,url,license,license_url,enabled,error) values
 ('global-voices','Global Voices','https://globalvoices.org/-/topics/good-news/feed/','CC BY 3.0','https://globalvoices.org/about/',true,null),
 ('nasa','NASA','https://www.nasa.gov/feed/','NASA media usage guidelines','https://www.nasa.gov/nasa-brand-center/images-and-media/',true,null),
 ('positive-news','Positive News','https://www.positive.news/feed/','Publisher permission required','https://www.positive.news/terms-and-conditions/',false,'Awaiting permission for automated storage and republication');
revoke all on private.news_sources,private.news_imports,private.news_failures from public,anon,authenticated;
create function public.news_store(p_action text,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.news_sources; item jsonb; existing text; published timestamptz; n integer:=0;
begin
 if p_action='sources' then return (select coalesce(jsonb_agg(to_jsonb(x)),'[]') from private.news_sources x where enabled);end if;
 if p_action='claim' then
  update private.news_sources set lease_until=now()+interval '2 minutes',last_attempt=now() where id=p_data->>'id' and enabled and (lease_until is null or lease_until<now()) and (last_attempt is null or last_attempt<now()-interval '15 minutes') returning * into s;
  return to_jsonb(s);
 end if;
 if p_action='failure' then
  update private.news_sources set error=left(p_data->>'error',200),lease_until=null where id=p_data->>'id';
  insert into private.news_failures(source_id,code) values(p_data->>'id',left(p_data->>'error',200));
  delete from private.news_failures where created_at<now()-interval '30 days';return 'true';
 end if;
 if p_action='save' then
  select * into s from private.news_sources where id=p_data->>'id' and enabled;if s.id is null then raise exception 'Unknown source';end if;
  for item in select value from jsonb_array_elements(p_data->'items') loop
   published:=(item->>'publishedAt')::timestamptz;
   if published is null or published>now() or published<now()-interval '120 days' then continue;end if;
   perform pg_advisory_xact_lock(hashtextextended(item->>'fingerprint',42));
   select id into existing from private.news_imports where canonical_url=item->>'url' or fingerprint=item->>'fingerprint' limit 1;
   if existing is not null then continue;end if;
   insert into public.content_items(id,kind,data,published,sort_at) values(item->>'id','feed',item-'fingerprint',true,published) on conflict(id) do nothing;
   insert into private.news_imports(id,canonical_url,fingerprint,source_id) values(item->>'id',item->>'url',item->>'fingerprint',s.id) on conflict do nothing;n:=n+1;
  end loop;
  update private.news_sources set last_success=now(),error=null,lease_until=null where id=s.id;
  return jsonb_build_object('imported',n);
 end if;
 if p_action='unseen' then return (select coalesce(jsonb_agg(i),'[]') from jsonb_array_elements(p_data->'items') i where not exists(select 1 from private.news_imports n where n.canonical_url=i->>'url' or n.fingerprint=i->>'fingerprint'));end if;
 if p_action='health' then return (select jsonb_agg(jsonb_build_object('name',name,'enabled',enabled,'lastSuccess',last_success,'error',error)) from private.news_sources);end if;
 raise exception 'Unknown action';
end;$$;
revoke all on function public.news_store(text,jsonb) from public,anon,authenticated;
grant execute on function public.news_store(text,jsonb) to service_role;

-- Hosted Postgres refreshes independently of visitors. PGlite skips unsupported extensions.
do $setup$ begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') and exists(select 1 from pg_available_extensions where name='pg_net') then
  create extension if not exists pg_cron with schema pg_catalog;
  create extension if not exists pg_net with schema extensions;
  execute $schedule$select cron.schedule('grace-discover-news','*/15 * * * *',
   $job$select net.http_post(url:='https://gxuwmgztksktacwvdipy.supabase.co/functions/v1/news',headers:='{"Content-Type":"application/json"}'::jsonb,body:='{}'::jsonb,timeout_milliseconds:=55000);$job$)$schedule$;
 end if;
end;$setup$;
