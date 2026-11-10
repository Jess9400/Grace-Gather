import {
  collections,
  getReadingVerse,
  chapterSource,
  isThemeVerse,
  studyFor,
  type CollectionId,
  type ReadingVerse,
} from "./bible";

// The theme map uses Hebrew/WEB numbering. These are explicit correspondences
// for its six Psalms, checked against each bundled edition, not chapter offsets.
const psalms: Record<string, Record<"dra" | "brenton" | "synodal", string>> = {
  "PSA.13.1": { dra: "PSA.12.1", brenton: "PSA.12.2", synodal: "PSA.12.2" },
  "PSA.34.18": { dra: "PSA.33.19", brenton: "PSA.33.19", synodal: "PSA.33.19" },
  "PSA.42.11": { dra: "PSA.41.12", brenton: "PSA.41.12", synodal: "PSA.41.12" },
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
const otherVerses: Record<string, Partial<Record<CollectionId, string>>> = {
  "MAT.5.4": { dra: "MAT.5.5" },
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
  if (verse?.text) return verse;
  // The bundled Brenton reader omits this first verse after the psalm heading.
  // Preserve the publisher's exact text/citation instead of silently substituting
  // an unrelated mood verse. Source checked: https://ebible.org/eng-Brenton/PSA114.htm
  if (id === "brenton:PSA.114.1") {
    const index = collections.brenton.index;
    const book = index.books.find((b) => b.code === "PSA")!;
    return {
      id,
      collection,
      reference: `${book.name} 114:1`,
      text: "Alleluia. I am well pleased, because the Lord will hearken to the voice of my supplication.",
      sourceUrl: chapterSource("PSA", 114, collection),
      editionName: book.sourceEdition ?? index.edition,
      attribution: book.sourceAttribution ?? index.attribution ?? "",
      licenseUrl: book.sourceLicenseUrl ?? index.licenseUrl ?? "",
      notes: [],
    };
  }
  return null;
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
