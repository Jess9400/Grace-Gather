// Only extract links, not publisher text: articles remain on the publisher's site.
const HOST = 'christianfaithstories.org';
// These catalogue links are two halves of a series, rather than standalone stories.
const EXCLUDED = new Set([
  'https://christianfaithstories.org/wp-content/uploads/2026/09/Reflecting-Gods-Light.pdf',
  'https://christianfaithstories.org/wp-content/uploads/2026/09/Night-Light.pdf',
]);
export function catalog(html) {
  if (typeof html !== 'string' || html.length > 2_000_000) throw Error('invalid_catalog');
  const result = [], seen = new Set();
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u; try { u = new URL(match[1], `https://${HOST}/`); } catch { continue; }
    if (u.protocol !== 'https:' || u.hostname !== HOST || u.username || u.password || u.search || u.hash || EXCLUDED.has(u.href) || !/^\/wp-content\/uploads\/\d{4}\/\d{2}\/[a-z0-9%._-]+\.pdf$/i.test(u.pathname)) continue;
    const title = match[2].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#0*39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
    if (title.length < 5 || title.length > 120 || /[<>\u0000-\u001f]/.test(title) || seen.has(u.href)) continue;
    // Avoid displaying seasonal stories at the wrong time of year.
    if (/christmas|advent|easter|lent|mother.s day|father.s day|thanksgiving|veterans day|memorial day|independence day|4th of july|new year|9\/11/i.test(title)) continue;
    seen.add(u.href); result.push({title, url: u.href});
  }
  // Upload paths carry year/month, not a verified publication date. Use them
  // only to prioritize recent additions; never present them as story dates.
  return result.sort((a,b) => b.url.match(/uploads\/(\d{4})\/(\d{2})/)[0].localeCompare(a.url.match(/uploads\/(\d{4})\/(\d{2})/)[0]));
}
