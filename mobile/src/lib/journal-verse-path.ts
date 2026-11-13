import type { Entry } from "./content";
import { journalTheme } from "./journal-guidance";

// Some sorrows come back day after day. For these themes the journal keeps a
// short path of verses instead of one: each new entry on the theme gets the
// next verse, still only one at a time, so the same words are not repeated
// every day. The order is pastoral: lament and God's nearness first, hope last.
// References use Hebrew/WEB numbering, like the theme map.
export const versePaths: Record<string, string[]> = {
  grief: [
    "PSA.147.3", // He heals the broken in heart
    "JHN.11.35", // Jesus wept
    "PSA.34.18", // The LORD is near to the broken-hearted
    "PSA.23.4", // The valley of the shadow of death: you are with me
    "REV.21.4", // He will wipe away every tear
  ],
};
export const pathReferences = [...new Set(Object.values(versePaths).flat())];

// The verse for this entry: a theme's one verse, or on a verse path the step
// after the person's earlier entries on the same theme (counted from the
// journal on the device; nothing is sent anywhere).
export function journalVerseFor(
  entry: Entry,
  journal: Entry[] = [],
  theme = journalTheme(entry),
) {
  const path = versePaths[theme.id];
  if (!path) return theme.verse;
  const earlier = journal.filter(
    (e) =>
      e.id !== entry.id &&
      !e.deletedAt &&
      e.createdAt < entry.createdAt &&
      journalTheme(e).id === theme.id,
  ).length;
  return path[earlier % path.length];
}
