export type DiscoverCursorItem = { id: string; sort_at?: string };

/** Refresh the newest page without dropping older pages already loaded. */
export function mergeDiscoverPage<T extends DiscoverCursorItem>(
  old: T[],
  rows: T[],
  append: boolean,
  preserveOlder: boolean,
): T[] {
  if (append)
    return [...old, ...rows.filter((x) => !old.some((p) => p.id === x.id))];
  if (!preserveOlder || rows.length < 15) return rows;
  const last = rows.at(-1);
  return [
    ...rows,
    ...old.filter(
      (x) =>
        last &&
        x.sort_at &&
        last.sort_at &&
        (x.sort_at < last.sort_at ||
          (x.sort_at === last.sort_at && x.id < last.id)),
    ),
  ];
}
