-- Keep original Portuguese stories in the Portuguese feed, including when the
-- database contains them alongside older English-language content. Filtering
-- before LIMIT preserves cursor pagination.
create function public.discover_page_non_portuguese(
  p_filter text default 'all', p_before timestamptz default null,
  p_after_id text default '', p_limit integer default 15,
  p_search text default ''
) returns table(id text, data jsonb, sort_at timestamptz)
language sql stable security invoker set search_path = '' as $$
 select c.id, c.data, c.sort_at from public.content_items c
 where c.published and c.kind = 'feed'
   and coalesce(c.data->>'origin', '') <> 'news'
   and lower(coalesce(c.data->>'lang', '')) not in ('pt', 'pt-br')
   and (p_before is null or (c.sort_at, c.id) < (p_before, p_after_id))
   and (p_filter = 'all'
     or (p_filter = 'saved' and exists (select 1 from public.saved_items s
       where s.item_id = c.id and s.user_id = auth.uid()))
     or (p_filter not in ('all', 'news', 'older', 'saved')
       and c.data->>'type' = p_filter))
   and (p_search = '' or concat_ws(' ', c.data->>'title', c.data->>'summary', c.data->>'tags') ilike '%' || left(p_search, 100) || '%')
 order by c.sort_at desc, c.id desc
 limit greatest(1, least(p_limit, 30));
$$;
revoke all on function public.discover_page_non_portuguese(text,timestamptz,text,integer,text) from public;
grant execute on function public.discover_page_non_portuguese(text,timestamptz,text,integer,text) to anon, authenticated;
