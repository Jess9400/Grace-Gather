import type { Entry } from "./content";

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
  "persistent-distress": [
    "PSA.34.18", // The LORD is near to the broken-hearted
    "PSA.42.11", // Why are you in despair, my soul? Hope in God
    "1KI.19.7", // Arise and eat, the journey is too great for you
    "ISA.42.3", // A bruised reed he will not break
    "PSA.40.1", // I waited patiently; he turned to me
  ],
  lonely: [
    "DEU.31.8", // He will not fail you nor forsake you
    "PSA.25.16", // Turn to me, for I am desolate
    "JHN.14.18", // I will not leave you orphans
    "PSA.139.10", // Even there your hand will lead me
    "ISA.41.10", // Don't be afraid, for I am with you
  ],
  anxiety: [
    "1PE.5.7", // Cast your worries on him, he cares for you
    "PSA.94.19", // In the multitude of my thoughts, your comforts
    "PSA.56.3", // When I am afraid, I will trust in you
    "JHN.14.27", // Peace I leave with you
    "PHP.4.7", // The peace of God will guard your hearts
  ],
  illness: [
    "JAS.5.16", // Pray for one another, that you may be healed
    "PSA.6.2", // Have mercy on me, LORD, for I am faint
    "PSA.73.26", // God is the strength of my heart
    "2CO.12.9", // My grace is sufficient for you
    "2CO.4.16", // The inward person is renewed day by day
  ],
  hopelessness: [
    "LAM.3.22", // His compassion does not fail
    "PSA.13.1", // How long, LORD?
    "LAM.3.23", // New every morning; great is your faithfulness
    "ISA.43.2", // When you pass through the waters, I will be with you
    "ROM.15.13", // The God of hope fill you with joy and peace
  ],
};
export const pathReferences = [...new Set(Object.values(versePaths).flat())];

// The verse for this entry: a theme's one verse, or on a verse path the step
// after the person's earlier entries on the same theme (counted from the
// journal on the device; nothing is sent anywhere). `themeOf` reads an
// entry's theme id (the journal's own reader, passed in by the caller).
export function journalVerseFor(
  entry: Entry,
  journal: Entry[],
  theme: { id: string; verse: string },
  themeOf: (entry: Entry) => string,
) {
  const path = versePaths[theme.id];
  if (!path) return theme.verse;
  const earlier = journal.filter(
    (e) =>
      e.id !== entry.id &&
      !e.deletedAt &&
      e.createdAt < entry.createdAt &&
      themeOf(e) === theme.id,
  ).length;
  return path[earlier % path.length];
}
