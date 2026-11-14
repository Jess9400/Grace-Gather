begin;
do $$
declare result text; first_story jsonb; amount integer;
begin
  select count(*) into amount from private.portuguese_bible_story_pool;
  if amount <> 29 then raise exception 'incorrect story count: %',amount; end if;
  if has_table_privilege('authenticated','private.portuguese_bible_story_pool','select') then
    raise exception 'unpublished pool is visible to members';
  end if;
  result := private.publish_portuguese_bible_story('2026-11-14 10:59:00+00');
  if result <> 'not_due' then raise exception 'published before 8am: %',result; end if;
  result := private.publish_portuguese_bible_story('2026-11-14 11:01:00+00');
  if result <> 'published' then raise exception 'Bible fallback did not publish: %',result; end if;
  select data into first_story from public.content_items where id='biblia-livre-luk-10-25-37';
  if first_story is null or first_story->>'origin'<>'publisher' or first_story->>'lang'<>'pt'
    or first_story->>'rightsStatus'<>'licensed' or first_story->>'sourceCountry'<>'BR'
    or first_story->>'licenseUrl'<>'https://creativecommons.org/licenses/by/4.0/'
    or length(first_story->'body'->>'pt')<=length(first_story->'summary'->>'pt')
  then raise exception 'missing license, source, or full text'; end if;
  result := private.publish_portuguese_bible_story('2026-11-14 20:00:00+00');
  if result <> 'already_published' then raise exception 'published twice: %',result; end if;
  result := private.publish_portuguese_bible_story('2026-11-15 11:01:00+00');
  if result <> 'published' then raise exception 'next narrative not published: %',result; end if;
  update private.portuguese_bible_story_pool set published_on=('2030-01-01'::date + ordinal)
    where published_on is null;
  result := private.publish_portuguese_bible_story('2026-11-16 11:01:00+00');
  if result <> 'source_exhausted' then raise exception 'exhausted pool should remain empty: %',result; end if;
end $$;
rollback;
