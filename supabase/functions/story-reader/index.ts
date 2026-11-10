import { admin, apiKey, json, serve } from "../_shared/http.ts";
import { extractPublisherText, publisherUrl, readBounded } from "../_shared/publisher-reader.ts";

// Only published catalogue items can be read. The upstream URL cannot be
// supplied by the caller; redirects, large files and excessive pages are rejected.
const cache = new Map<string, { pages: string[]; until: number }>();
const pending = new Map<string, Promise<string[]>>();
serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  // This is public catalogue content, but require the configured app key; the
  // key is publishable and is not an authorization mechanism for user data.
  if (req.headers.get("apikey") !== apiKey("publishable")) return json({ error: "unauthorized" }, 401);
  let id: unknown;
  try { id = JSON.parse(new TextDecoder().decode(await readBounded(req.body, 1024))).id; }
  catch { return json({ error: "invalid_request" }, 400); }
  if (typeof id !== "string" || !/^publisher-[a-f0-9]{32}$/.test(id)) return json({ error: "not_found" }, 404);
  const record = await admin().from("content_items").select("data").eq("id", id).eq("kind", "feed").eq("published", true).maybeSingle();
  if (record.error || record.data?.data?.origin !== "publisher") return json({ error: "not_found" }, 404);
  const url = publisherUrl(record.data.data.url);
  if (!url) return json({ error: "not_found" }, 404);
  const hit = cache.get(url);
  if (hit && hit.until > Date.now()) return json({ pages: hit.pages });
  if (!pending.has(url)) {
    if (pending.size >= 4) return json({ error: "busy" }, 503);
    const work = (async () => {
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(12000) });
      if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("application/pdf")) throw Error("unavailable");
      const bytes = await readBounded(response.body, 2_000_000);
      const pages = await extractPublisherText(bytes);
      if (cache.size >= 50) cache.delete(cache.keys().next().value!);
      cache.set(url, { pages, until: Date.now() + 3_600_000 });
      return pages;
    })();
    pending.set(url, work);
  }
  try { return json({ pages: await pending.get(url)! }); }
  catch { return json({ error: "unavailable" }, 503); }
  finally { pending.delete(url); }
});
