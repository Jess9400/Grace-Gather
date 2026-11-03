import { serve, json } from "../_shared/http.ts";
let cached: {
  at: number;
  items: { title: string; summary: string; url: string; published: string }[];
} | null = null;
const clean = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
serve(async () => {
  const now = Date.now();
  if (cached && now - cached.at < 300000)
    return json({
      items: cached.items.filter(
        (x) => Date.parse(x.published) >= now - 86400000,
      ),
    });
  const response = await fetch("https://www.positive.news/feed/", {
    headers: { Accept: "application/rss+xml" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("news_unavailable");
  const xml = await response.text();
  if (xml.length > 2000000) throw new Error("news_too_large");
  const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)]
    .map((m) => {
      const field = (name: string) =>
        clean(
          m[1].match(
            new RegExp("<" + name + "[^>]*>([\\s\\S]*?)<\\/" + name + ">", "i"),
          )?.[1] ?? "",
        );
      return {
        title: field("title"),
        summary: field("description").split(" ").slice(0, 14).join(" ") + "…",
        url: field("link"),
        published: field("pubDate"),
      };
    })
    .filter(
      (x) =>
        /^https:\/\/(www\.)?positive\.news\//.test(x.url) &&
        x.title &&
        Date.parse(x.published) >= now - 86400000 &&
        Date.parse(x.published) <= now,
    )
    .slice(0, 8);
  cached = { at: now, items };
  return json({
    items,
    source: "Positive News",
    checkedAt: new Date(now).toISOString(),
  });
});
