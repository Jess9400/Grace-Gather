import {
  collections,
  getBook,
  getReadingVerse,
  type CollectionId,
  type ReadingVerse,
} from "./bible";

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const aliases: Record<string, string[]> = {
  JHN: ["john", "joao", "juan", "иоанна", "jn"],
  PSA: ["psalm", "psalms", "salmo", "salmos", "псалом", "псалтырь", "ps"],
};
export function searchBible(
  collection: CollectionId,
  query: string,
  limit = 20,
): ReadingVerse[] {
  const input = query.trim();
  if (!input || input.length < 3) return [];
  const books = collections[collection].index.books;
  const reference = input.match(/^(.+?)\s+(\d+)(?::(\d+[a-z]?))?$/i);
  if (reference) {
    const name = normalize(reference[1]);
    const book = books.find((b) =>
      [b.name, b.code, ...(aliases[b.code] ?? [])].some(
        (candidate) => normalize(candidate) === name,
      ),
    );
    if (!book) return [];
    const chapter = Number(reference[2]);
    const verses =
      getBook(book.code, collection)?.chapters[String(chapter)] ?? [];
    const selected = reference[3]
      ? verses.filter(
          (v) => v.number.toLowerCase() === reference[3].toLowerCase(),
        )
      : verses.slice(0, 1);
    return selected
      .map((v) =>
        getReadingVerse(`${collection}:${book.code}.${chapter}.${v.number}`),
      )
      .filter((v): v is ReadingVerse => !!v);
  }
  const term = normalize(input);
  if (term.length < 3) return [];
  const found: ReadingVerse[] = [];
  for (const metadata of books) {
    const book = getBook(metadata.code, collection);
    if (!book) continue;
    for (const [chapter, verses] of Object.entries(book.chapters)) {
      for (const verse of verses) {
        if (!normalize(verse.text).includes(term)) continue;
        const result = getReadingVerse(
          `${collection}:${metadata.code}.${chapter}.${verse.number}`,
        );
        if (result) found.push(result);
        if (found.length >= limit) return found;
      }
    }
  }
  return found;
}
