import type { Entry } from "./content";
import { applyJournalRetention } from "./journal-retention";

/** Keep expired audio tombstones until their private files are deleted. */
export function planAccountRetention(
  entries: Entry[],
  enabled: boolean,
  now = Date.now(),
) {
  const result = applyJournalRetention(entries, enabled, now);
  const kept = new Map(result.entries.map((entry) => [entry.id, entry]));
  const planned = entries.flatMap((entry) => {
    const retained = kept.get(entry.id);
    if (retained) return [retained];
    if (!entry.deletedAt || !entry.audio) return [];
    // A still-live entry may share the same recording after a backup import.
    if (result.entries.some((other) => other.audio === entry.audio)) return [];
    return [
      {
        ...entry,
        purgeRequestedAt: entry.purgeRequestedAt ?? new Date(now).toISOString(),
      },
    ];
  });
  return {
    entries: planned,
    changed:
      result.changed ||
      planned.some(
        (entry, index) =>
          entry.purgeRequestedAt !== entries[index]?.purgeRequestedAt,
      ),
    audioToRemove: planned.filter(
      (entry) => !!entry.purgeRequestedAt && !!entry.deletedAt && !!entry.audio,
    ),
  };
}
