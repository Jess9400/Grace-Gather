import webIndex from "../generated/bible/index.json";
import draIndex from "../generated/bible-dra/index.json";
import brentonIndex from "../generated/bible-brenton/index.json";
import studies from "../generated/quiet-studies.json";
import { data, Preferences } from "./content";
import { bookLoaders as webLoaders } from "../generated/bible/loaders";
import { bookLoaders as draLoaders } from "../generated/bible-dra/loaders";
import { bookLoaders as brentonLoaders } from "../generated/bible-brenton/loaders";
export type CollectionId = "web" | "dra" | "brenton";
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
  web: {
    index: {
      ...webIndex,
      edition: "World English Bible · Protestant edition",
      attribution:
        "World English Bible. Public domain. Text supplied by eBible.org.",
      licenseUrl: "https://ebible.org/engwebp/copyright.htm",
      coverageNote: "The 66-book Protestant collection.",
    },
    loaders: webLoaders,
  },
  dra: { index: draIndex, loaders: draLoaders },
  brenton: { index: brentonIndex, loaders: brentonLoaders },
};
export function collectionFor(p: Preferences): CollectionId | null {
  if (p.scriptureLanguage !== "en") return null;
  if (p.edition === "web" && p.tradition === "protestant") return "web";
  if (p.edition === "dra" && p.tradition === "catholic") return "dra";
  if (p.edition === "brenton" && p.tradition === "orthodox") return "brenton";
  return null;
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
    if (!verse || !["web", "dra", "brenton"].includes(edition.id)) continue;
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
      /^[a-z]+:[A-Z0-9]{3}\.\d+\.[^:]+$|^[A-Z0-9]{3}\.\d+\.[^:]+$/.test(id)
    ) {
      const qualified = id.includes(":") ? id : `web:${id}`;
      return (
        chapterRows(b, chapter, collection).find((v) => v.id === qualified) ??
        null
      );
    }
  }
  for (const edition of data.editions) {
    const v = edition.passages.find((v) => v.id === id);
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
  if (/^(web|dra|brenton):[A-Z0-9]{3}\.\d+\.\d+$/.test(direct)) {
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
