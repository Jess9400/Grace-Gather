-- A separate endpoint lets older app builds continue using discover_page.
-- Only stories actually written in Portuguese qualify; Brazilian publisher and
-- editorial pieces must be explicitly identified as Brazilian. Community
-- testimonies use the author's declared language, not an inferred location.
create function public.discover_page_portuguese(
  p_filter text default 'all',
  p_before timestamptz default null,
  p_after_id text default '',
  p_limit integer default 15,
  p_search text default ''
) returns table(id text, data jsonb, sort_at timestamptz)
language sql stable security invoker set search_path = '' as $$
 select c.id, c.data, c.sort_at
 from public.content_items c
 where c.published and c.kind = 'feed'
   and coalesce(c.data->>'origin', '') <> 'news'
   and lower(coalesce(c.data->>'lang', '')) in ('pt', 'pt-br')
   and length(btrim(coalesce(c.data->'title'->>'pt', ''))) > 0
   and length(btrim(coalesce(c.data->'summary'->>'pt', ''))) > 0
   and (
     c.data->>'origin' = 'community'
     or (c.data->>'origin' = 'editorial'
       and upper(coalesce(c.data->>'sourceCountry', '')) = 'BR')
     or (c.data->>'origin' = 'publisher'
       and upper(coalesce(c.data->>'sourceCountry', '')) = 'BR'
       and c.data->>'rightsStatus' in ('licensed', 'public_domain')
       and length(btrim(coalesce(c.data->'body'->>'pt', ''))) > 0)
   )
   and (p_before is null or (c.sort_at, c.id) < (p_before, p_after_id))
   and (p_filter = 'all'
     or (p_filter = 'saved' and exists (
       select 1 from public.saved_items s
       where s.item_id = c.id and s.user_id = auth.uid()
     ))
     or (p_filter not in ('all', 'news', 'older', 'saved')
       and c.data->>'type' = p_filter))
   and (p_search = '' or concat_ws(' ', c.data->>'title', c.data->>'summary', c.data->>'tags') ilike '%' || left(p_search, 100) || '%')
 order by c.sort_at desc, c.id desc
 limit greatest(1, least(p_limit, 30));
$$;
revoke all on function public.discover_page_portuguese(text,timestamptz,text,integer,text) from public;
grant execute on function public.discover_page_portuguese(text,timestamptz,text,integer,text) to anon, authenticated;
