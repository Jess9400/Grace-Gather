create or replace function public.discover_page(p_filter text default 'all',p_before timestamptz default null,p_after_id text default '',p_limit integer default 15,p_search text default '') returns table(id text,data jsonb,sort_at timestamptz) language sql stable security invoker set search_path='' as $$
 select c.id,c.data,c.sort_at from public.content_items c where c.published and c.kind='feed'
 and coalesce(c.data->>'origin','')<>'news'
 and (p_before is null or (c.sort_at,c.id)<(p_before,p_after_id))
 and (p_filter='all' or (p_filter='news' and c.data->>'origin'='news' and c.sort_at>=now()-interval '24 hours' and c.sort_at<=now()) or (p_filter='older' and c.data->>'origin'='news' and c.sort_at<now()-interval '24 hours') or (p_filter='saved' and exists(select 1 from public.saved_items s where s.item_id=c.id and s.user_id=auth.uid())) or (p_filter not in ('all','news','older','saved') and c.data->>'type'=p_filter))
 and (p_search='' or concat_ws(' ',c.data->>'title',c.data->>'summary',c.data->>'tags') ilike '%'||left(p_search,100)||'%')
 order by c.sort_at desc,c.id desc limit greatest(1,least(p_limit,30));$$;

-- Pause refresh while news is outside the product scope; keep cached stories intact.
do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  execute $q$select cron.unschedule(jobid) from cron.job where jobname='grace-discover-news'$q$;
 end if;
end $$;
