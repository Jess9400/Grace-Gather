import themeMap from "../generated/journal-map.json";
import { pathReferences } from "./journal-verse-path";
import {
  collections,
  getReadingVerse,
  isThemeVerse,
  studyFor,
  type CollectionId,
  type ReadingVerse,
} from "./bible";

const themeReferences = [
  ...new Set([...themeMap.map((theme) => theme.verse), ...pathReferences]),
];

// The theme map uses Hebrew/WEB numbering. These are explicit correspondences
// for its Psalms, checked against each bundled edition, not chapter offsets.
const psalms: Record<string, Record<"dra" | "brenton" | "synodal", string>> = {
  "PSA.13.1": { dra: "PSA.12.1", brenton: "PSA.12.2", synodal: "PSA.12.2" },
  "PSA.23.4": { dra: "PSA.22.4", brenton: "PSA.22.4", synodal: "PSA.22.4" },
  "PSA.23.2": { dra: "PSA.22.2", brenton: "PSA.22.2", synodal: "PSA.22.2" },
  "PSA.46.10": { dra: "PSA.45.11", brenton: "PSA.45.11", synodal: "PSA.45.11" },
  "PSA.51.10": { dra: "PSA.50.12", brenton: "PSA.50.12", synodal: "PSA.50.12" },
  "PSA.55.22": { dra: "PSA.54.23", brenton: "PSA.54.23", synodal: "PSA.54.23" },
  "PSA.56.8": { dra: "PSA.55.9", brenton: "PSA.55.9", synodal: "PSA.55.9" },
  "PSA.61.2": { dra: "PSA.60.3", brenton: "PSA.60.3", synodal: "PSA.60.3" },
  "PSA.73.23": { dra: "PSA.72.23", brenton: "PSA.72.23", synodal: "PSA.72.23" },
  "PSA.103.12": { dra: "PSA.102.12", brenton: "PSA.102.12", synodal: "PSA.102.12" },
  "PSA.126.5": { dra: "PSA.125.5", brenton: "PSA.125.5", synodal: "PSA.125.5" },
  "PSA.6.2": { dra: "PSA.6.3", brenton: "PSA.6.3", synodal: "PSA.6.3" },
  "PSA.25.16": { dra: "PSA.24.16", brenton: "PSA.24.16", synodal: "PSA.24.16" },
  "PSA.40.1": { dra: "PSA.39.2", brenton: "PSA.39.2", synodal: "PSA.39.2" },
  "PSA.56.3": { dra: "PSA.55.4", brenton: "PSA.55.4", synodal: "PSA.55.4" },
  "PSA.73.26": { dra: "PSA.72.26", brenton: "PSA.72.26", synodal: "PSA.72.26" },
  "PSA.94.19": { dra: "PSA.93.19", brenton: "PSA.93.19", synodal: "PSA.93.19" },
  "PSA.139.10": { dra: "PSA.138.10", brenton: "PSA.138.10", synodal: "PSA.138.10" },
  "PSA.34.18": { dra: "PSA.33.19", brenton: "PSA.33.19", synodal: "PSA.33.19" },
  "PSA.42.11": { dra: "PSA.41.12", brenton: "PSA.41.12", synodal: "PSA.41.12" },
  "PSA.62.8": { dra: "PSA.61.9", brenton: "PSA.61.9", synodal: "PSA.61.9" },
  "PSA.116.1": { dra: "PSA.114.1", brenton: "PSA.114.1", synodal: "PSA.114.1" },
  "PSA.139.23": {
    dra: "PSA.138.23",
    brenton: "PSA.138.23",
    synodal: "PSA.138.23",
  },
  "PSA.147.3": { dra: "PSA.146.3", brenton: "PSA.146.3", synodal: "PSA.146.3" },
};

// The Vulgate places the meek before those who mourn, so Douay-Rheims prints
// Matthew 5:4 of the theme map as 5:5 (as Figueiredo and Torres Amat do).
// Brenton numbers Lamentations 3:22 and 3:23 as 3:21a and 3:21b.
const otherVerses: Record<string, Partial<Record<CollectionId, string>>> = {
  "MAT.5.4": { dra: "MAT.5.5" },
  "LAM.3.22": { brenton: "LAM.3.21a" },
  "LAM.3.23": { brenton: "LAM.3.21b" },
};

export function journalVerseId(collection: CollectionId, reference: string) {
  const other = otherVerses[reference]?.[collection];
  if (other) return `${collection}:${other}`;
  if (
    reference.startsWith("PSA.") &&
    (collection === "dra" ||
      collection === "brenton" ||
      collection === "synodal")
  ) {
    const translated = psalms[reference]?.[collection];
    return translated ? `${collection}:${translated}` : null;
  }
  return `${collection}:${reference}`;
}

export function journalScripture(
  collection: CollectionId,
  reference: string,
): ReadingVerse | null {
  const id = journalVerseId(collection, reference);
  if (!id) return null;
  const verse = getReadingVerse(id);
  return verse?.text ? verse : null;
}

// The theme reference a displayed verse stands for, or undefined when the verse
// is something else (a mood fallback, or any verse opened from the Bible tab).
// Only explicit correspondences count, so an explanation written for one verse
// never lands on a different verse that shares its number in another edition.
export function journalStudyReference(
  verseId: string,
  reference: string | undefined,
) {
  if (!reference) return undefined;
  const [prefix] = verseId.split(":");
  if (verseId.includes(":") && Object.hasOwn(collections, prefix))
    return journalVerseId(prefix as CollectionId, reference) === verseId
      ? reference
      : undefined;
  const study = studyFor(verseId);
  return isThemeVerse(verseId, reference) ||
    (study?.editionId === "web" && study.bibleId === reference)
    ? reference
    : undefined;
}

// The journal theme reference for a verse opened anywhere (e.g. from the Bible
// tab), when that verse is one of the journal's theme verses in this edition.
export function themeReferenceFor(verseId: string) {
  const [prefix] = verseId.split(":");
  if (!verseId.includes(":") || !Object.hasOwn(collections, prefix))
    return undefined;
  return themeReferences.find(
    (reference) =>
      journalVerseId(prefix as CollectionId, reference) === verseId,
  );
}
