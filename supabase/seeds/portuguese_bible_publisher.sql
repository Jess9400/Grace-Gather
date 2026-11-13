-- Release one exact Bible narrative per Brazilian calendar day. Once the
-- finite source is exhausted, return empty; never recycle or invent posts.
create function private.publish_portuguese_bible_story(p_now timestamptz default now()) returns text
language plpgsql security definer set search_path = '' as $$
declare item text; chosen integer; bible_data jsonb;
  today date := (p_now at time zone 'America/Sao_Paulo')::date;
begin
  perform pg_advisory_xact_lock(hashtext('grace-portuguese-daily-bible'));
  if p_now is null then raise exception 'invalid_time'; end if;
  if extract(hour from (p_now at time zone 'America/Sao_Paulo')) < 8 then return 'not_due'; end if;
  if exists(select 1 from private.portuguese_story_releases where published_on=today) then return 'already_published'; end if;
  select p.ordinal,p.data into chosen,bible_data from private.portuguese_bible_story_pool p
    where p.published_on is null
    and not exists(select 1 from public.content_items c where c.id=p.data->>'id')
    order by p.ordinal limit 1 for update of p;
  if chosen is null then return 'source_exhausted'; end if;
  item:=bible_data->>'id';
  insert into public.content_items(id,kind,data,published,sort_at)
    values(item,'feed',bible_data || jsonb_build_object('publishedAt',p_now),true,p_now);
  update private.portuguese_bible_story_pool set published_on=today where ordinal=chosen;
  insert into private.portuguese_story_releases(published_on,item_id,published_at) values(today,item,p_now);
  return 'published';
end $$;
revoke all on function private.publish_portuguese_bible_story(timestamptz) from public,anon,authenticated;

-- Hourly retries after 08:00 São Paulo; the release log and lock prevent
-- duplicates. This does not read web pages or accept user-supplied content.
do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.schedule('grace-portuguese-daily-bible','17 * * * *',
      'select private.publish_portuguese_bible_story()');
  end if;
end $$;
