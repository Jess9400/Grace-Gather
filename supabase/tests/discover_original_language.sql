-- Run against an isolated database after applying the migration.
begin;
insert into public.content_items(id, kind, published, sort_at, data) values
('br-publisher', 'feed', true, '2026-11-13 12:00Z', '{"origin":"publisher","lang":"pt","sourceCountry":"BR","rightsStatus":"licensed","title":{"pt":"Esperança"},"summary":{"pt":"Uma história"},"body":{"pt":"Uma história completa"},"type":"stories"}'),
('pt-community', 'feed', true, '2026-11-13 11:00Z', '{"origin":"community","lang":"pt","title":{"pt":"Minha história"},"summary":{"pt":"Minha história"},"type":"testimonies"}'),
('english', 'feed', true, '2026-11-13 10:00Z', '{"origin":"publisher","lang":"en","sourceCountry":"BR","title":{"en":"A story","pt":"Uma história"},"summary":{"en":"A story","pt":"Uma história"}}'),
('portuguese-outside-brazil', 'feed', true, '2026-11-13 09:00Z', '{"origin":"publisher","lang":"pt","sourceCountry":"PT","title":{"pt":"Outra"},"summary":{"pt":"Outra"}}'),
('unknown-source', 'feed', true, '2026-11-13 08:00Z', '{"origin":"publisher","lang":"pt","title":{"pt":"Outra"},"summary":{"pt":"Outra"}}'),
('without-rights', 'feed', true, '2026-11-13 07:30Z', '{"origin":"publisher","lang":"pt","sourceCountry":"BR","title":{"pt":"Outra"},"summary":{"pt":"Outra"},"body":{"pt":"Outra"}}'),
('news', 'feed', true, '2026-11-13 07:00Z', '{"origin":"news","lang":"pt","sourceCountry":"BR","title":{"pt":"Notícia"},"summary":{"pt":"Notícia"}}');

do $$
declare ids text[];
begin
  select array_agg(id order by sort_at desc) into ids from public.discover_page_portuguese();
  if ids is distinct from array['br-publisher','pt-community'] then
    raise exception 'Wrong language/source filtering: %', ids;
  end if;
  select array_agg(id) into ids from public.discover_page_portuguese(p_limit => 1);
  if ids is distinct from array['br-publisher'] then
    raise exception 'Wrong first page: %', ids;
  end if;
  select array_agg(id) into ids from public.discover_page_portuguese(p_before => '2026-11-13 12:00Z', p_after_id => 'br-publisher', p_limit => 1);
  if ids is distinct from array['pt-community'] then
    raise exception 'Wrong second page: %', ids;
  end if;
  select array_agg(id) into ids from public.discover_page_portuguese(p_search => 'Esperança');
  if ids is distinct from array['br-publisher'] then
    raise exception 'Wrong search result: %', ids;
  end if;
end $$;
rollback;
