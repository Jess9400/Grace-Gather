import type { Gathering } from "./gatherings";

// Collapse occurrences only after applying date/search/tab filters. The
// selected date still opens that day's actual session, never an arbitrary one.
export function nextSessionPerSeries(items: Gathering[]): Gathering[] {
  const seen = new Set<string>();
  return [...items].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)).filter((g) => {
    const key = g.series_id || g.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
