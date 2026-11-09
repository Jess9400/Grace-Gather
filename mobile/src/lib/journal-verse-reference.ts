import {
  collections,
  getReadingVerse,
  chapterSource,
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

export function journalVerseId(collection: CollectionId, reference: string) {
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
