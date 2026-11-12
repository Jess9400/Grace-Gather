import webIndex from "../generated/bible/index.json";
import draIndex from "../generated/bible-dra/index.json";
import brentonIndex from "../generated/bible-brenton/index.json";
import studies from "../generated/quiet-studies.json";
import { data, Preferences } from "./content";
import blivreIndex from "../generated/bible-blivre/index.json";
import rv1909Index from "../generated/bible-rv1909/index.json";
import synodalIndex from "../generated/bible-synodal/index.json";
export type CollectionId =
  "web" | "dra" | "brenton" | "blivre" | "rv1909" | "synodal";
interface BookMetadata {
  code: string;
  name: string;
  chapters: number;
  sourceEdition?: string;
  sourceBookCode?: string;
  sourceChapterOffset?: number;
  sourceChapterDigits?: number;
  sourceBaseUrl?: string;
  sourceLicenseUrl?: string;
  sourceAttribution?: string;
}
interface CollectionIndex {
  edition: string;
  books: BookMetadata[];
  attribution?: string;
  licenseUrl?: string;
  coverageNote?: string;
}
export interface BibleVerse {
  id: string;
  number: string;
  text: string;
  notes: string[];
}
export interface BibleBook {
  book: BookMetadata;
  chapters: Record<string, BibleVerse[]>;
}
export interface ReadingVerse {
  id: string;
  text: string;
  reference: string;
  sourceUrl: string;
  editionName: string;
  attribution: string;
  licenseUrl: string;
  notes: string[];
  collection?: CollectionId;
  context?: Record<string, string>;
}
export const collections: Record<
  CollectionId,
  { index: CollectionIndex; loaders: Record<string, () => BibleBook> }
> = {
  blivre: { index: blivreIndex, loaders: {} },
  rv1909: { index: rv1909Index, loaders: {} },
  synodal: { index: synodalIndex, loaders: {} },
  web: {
    index: {
      ...webIndex,
      edition: "World English Bible · Protestant edition",
      attribution:
        "World English Bible. Public domain. Text supplied by eBible.org.",
      licenseUrl: "https://ebible.org/engwebp/copyright.htm",
      coverageNote: "The 66-book Protestant collection.",
    },
    loaders: {},
  },
  dra: { index: draIndex, loaders: {} },
  brenton: { index: brentonIndex, loaders: {} },
};
// Every Bible's text loads only when it is first needed, so the first visit
// downloads none of them; book lists (the indexes above) are always present.
const pendingCollections: Partial<Record<CollectionId, Promise<void>>> = {};
export function ensureCollection(id: CollectionId): Promise<void> {
  if (Object.keys(collections[id].loaders).length) return Promise.resolve();
  return (pendingCollections[id] ??= (async () => {
    try {
      const loaded =
        id === "web"
          ? await import("../generated/bible/loaders")
          : id === "dra"
            ? await import("../generated/bible-dra/loaders")
            : id === "brenton"
              ? await import("../generated/bible-brenton/loaders")
              : id === "blivre"
                ? await import("../generated/bible-blivre/loaders")
                : id === "rv1909"
                  ? await import("../generated/bible-rv1909/loaders")
                  : id === "synodal"
                    ? await import("../generated/bible-synodal/loaders")
                    : null;
      if (!loaded) throw new Error("Bible collection unavailable");
      collections[id].loaders = loaded.bookLoaders;
    } catch (error) {
      delete pendingCollections[id];
      throw error;
    }
  })());
}
export function collectionFor(p: Preferences): CollectionId | null {
  const edition = data.editions.find(
    (e) =>
      e.id === p.edition &&
      e.language === p.scriptureLanguage &&
      (e.traditions as string[]).includes(p.tradition),
  );
  return edition && Object.hasOwn(collections, edition.id)
    ? (edition.id as CollectionId)
    : null;
}

export function getBook(
  code: string,
  collection: CollectionId = "web",
): BibleBook | null {
  return collections[collection].loaders[code]?.() ?? null;
}
export function chapterSource(
  code: string,
  chapter: number,
  collection: CollectionId = "web",
) {
  const metadata = collections[collection].index.books.find(
    (b) => b.code === code,
  );
  const sourceChapter = chapter + (metadata?.sourceChapterOffset ?? 0);
  return `${metadata?.sourceBaseUrl ?? "https://ebible.org/engwebp/"}${metadata?.sourceBookCode ?? code}${String(sourceChapter).padStart(metadata?.sourceChapterDigits ?? (code === "PSA" ? 3 : 2), "0")}.htm`;
}
// Douay-Rheims prints the Hebrew letter of each acrostic stanza (Lamentations,
// Psalm 118) as the first word of the verse, e.g. "Heth. The mercies of the
// Lord…". It is a heading, not Scripture, so it is not shown in the verse.
const acrostic =
  /^(?:Aleph|Beth|Ghimel|Gimel|Daleth|He|Vau|Zain|Heth|Teth|Jod|Caph|Lamed|Mem|Nun|Samech|Ain|Phe|Sade|Coph|Res|Sin|Thau|Tau)\.\s+/i;
function verseText(
  text: string,
  collection: CollectionId,
  code: string,
  chapter: number,
) {
  return collection === "dra" &&
    (code === "LAM" || (code === "PSA" && chapter === 118))
    ? text.replace(acrostic, "")
    : text;
}
export function chapterRows(
  bookIndex: number,
  chapter: number,
  collection: CollectionId = "web",
): ReadingVerse[] {
  const index = collections[collection].index,
    metadata = index.books[bookIndex];
  if (!metadata) return [];
  const book = getBook(metadata.code, collection);
  return (book?.chapters[String(chapter)] ?? []).map((v) => ({
    ...v,
    text: verseText(v.text, collection, metadata.code, chapter),
    id: `${collection}:${metadata.code}.${chapter}.${v.number}`,
    collection,
    reference: `${metadata.name} ${chapter}:${v.number}`,
    sourceUrl: chapterSource(metadata.code, chapter, collection),
    editionName: metadata.sourceEdition ?? index.edition,
    attribution: metadata.sourceAttribution ?? index.attribution ?? "",
    licenseUrl: metadata.sourceLicenseUrl ?? index.licenseUrl ?? "",
  }));
}
export function readingLocation(
  id: string,
): { collection: CollectionId; code: string; chapter: number } | null {
  const [prefix, rest] = id.includes(":") ? id.split(":") : ["web", id];
  if (!Object.hasOwn(collections, prefix)) return null;
  const [code, chapter] = rest.split(".");
  if (
    collections[prefix as CollectionId].index.books.some(
      (b) => b.code === code,
    ) &&
    Number(chapter) > 0
  )
    return {
      collection: prefix as CollectionId,
      code,
      chapter: Number(chapter),
    };
  for (const edition of data.editions) {
    const verse = edition.passages.find((v) => v.id === id);
    if (!verse || !Object.hasOwn(collections, edition.id)) continue;
    const match = verse.sourceUrl.match(/([A-Z0-9]{3})([0-9]+)\.htm$/);
    if (
      match &&
      collections[edition.id as CollectionId].index.books.some(
        (b) => b.code === match[1],
      )
    )
      return {
        collection: edition.id as CollectionId,
        code: match[1],
        chapter: Number(match[2]),
      };
    // Douay-Rheims curated quotations use drbo.org; match only an explicit alias.
    const alias = studyFor(id)?.aliases.find((a) =>
      a.startsWith(edition.id + ":"),
    );
    if (alias) {
      const [code, chapter] = alias.split(":")[1].split(".");
      return {
        collection: edition.id as CollectionId,
        code,
        chapter: Number(chapter),
      };
    }
  }
  return null;
}
export function getReadingVerse(id: string): ReadingVerse | null {
  const location = readingLocation(id);
  if (location) {
    const { collection, code, chapter } = location,
      index = collections[collection].index,
      b = index.books.findIndex((b) => b.code === code);
    if (
      b >= 0 &&
      /^[a-z0-9]+:[A-Z0-9]{3}\.\d+\.[^:]+$|^[A-Z0-9]{3}\.\d+\.[^:]+$/.test(id)
    ) {
      const qualified = id.includes(":") ? id : `web:${id}`;
      return (
        chapterRows(b, chapter, collection).find((v) => v.id === qualified) ??
        null
      );
    }
  }
  for (const edition of data.editions) {
    const v = editionVerses(edition).find((v) => v.id === id);
    if (v)
      return {
        ...v,
        notes: [],
        editionName: edition.name,
        attribution: edition.attribution,
        licenseUrl: edition.licenseUrl,
      };
  }
  return null;
}
// An edition's curated passages, plus the proofread verse for each journal
// theme that Bibles without a full reader carry (Figueiredo, Torres Amat).
function editionVerses(edition: (typeof data.editions)[number]) {
  return [
    ...edition.passages,
    ...(("journalVerses" in edition && edition.journalVerses) || []),
  ];
}
// The selected edition's own wording of a journal theme verse, given by its
// Hebrew-based reference (e.g. PSA.42.11, Psalm 41:12 in the Vulgate).
export function themeVerse(p: Preferences, verse: string) {
  const edition = data.editions.find(
    (e) =>
      e.id === p.edition &&
      e.language === p.scriptureLanguage &&
      (e.traditions as string[]).includes(p.tradition),
  );
  const match = edition
    ? editionVerses(edition).find((v) => "verse" in v && v.verse === verse)
    : undefined;
  return match ? getReadingVerse(match.id) : null;
}
// Whether a curated verse is an edition's own wording of that theme verse.
export function isThemeVerse(id: string, verse: string) {
  return data.editions.some((edition) =>
    editionVerses(edition).some(
      (v) => v.id === id && "verse" in v && v.verse === verse,
    ),
  );
}
export function studyFor(id: string) {
  // Curated IDs and full-reader aliases are explicit, including Psalm numbering.
  // Reflections are shared only for the identified passage, never by theme alone.
  const clean = id.replace(/^web:/, "");
  return studies.verses.find(
    (v) =>
      v.id === id ||
      (v.editionId === "web" && v.bibleId === clean) ||
      v.aliases.includes(id),
  );
}
export function discussionVerseId(id: string): string | null {
  const direct = id.includes(":") ? id : `web:${id}`;
  if (/^(web|dra|brenton|blivre|rv1909|synodal):[A-Z0-9]{3}\.\d+\.\d+[a-z]?$/.test(direct)) {
    return getReadingVerse(direct) ? direct : null;
  }
  const edition = data.editions.find((e) =>
    e.passages.some((v) => v.id === id),
  );
  const alias = studyFor(id)?.aliases.find((a) =>
    a.startsWith(`${edition?.id}:`),
  );
  return alias && getReadingVerse(alias) ? alias : null;
}
const readerLocations: Partial<
  Record<CollectionId, { book: number; chapter: number }>
> = {};
export function readReaderLocation(collection: CollectionId = "web") {
  return { ...(readerLocations[collection] ?? { book: 0, chapter: 1 }) };
}
export function rememberReaderLocation(
  book: number,
  chapter: number,
  collection: CollectionId = "web",
) {
  readerLocations[collection] = { book, chapter };
}
