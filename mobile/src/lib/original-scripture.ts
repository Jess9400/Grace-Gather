import { Platform } from "react-native";
import manifest from "../generated/study-original/manifest.json";
export type OriginalWord = [
  string,
  string,
  string[],
  string,
  string,
  string,
  string,
];
export type OriginalChapter = Record<string, OriginalWord[]>;
export const originalManifest = manifest;
const chapters = new Map<string, Promise<OriginalChapter>>();
const concordances = new Map<string, Promise<Record<string, string[]>>>();
const base =
  Platform.OS === "web" ? "" : "https://grace-gather.findflockie.workers.dev";
async function json<T>(path: string): Promise<T> {
  const response = await fetch(`${base}/study-original/v1/${path}.json`);
  if (!response.ok || !response.headers.get("content-type")?.includes("json"))
    throw Error("original_unavailable");
  return response.json();
}
export function originalChapter(
  book: string,
  chapter: number,
): Promise<OriginalChapter> {
  const available = (manifest.books as Record<string, number[]>)[book];
  if (!available?.includes(chapter))
    return Promise.reject(Error("original_unavailable"));
  const key = `${book}/${chapter}`;
  let pending = chapters.get(key);
  if (!pending) {
    pending = json<OriginalChapter>(`chapters/${key}`);
    chapters.set(key, pending);
    pending.catch(() => chapters.delete(key));
    if (chapters.size > 8) chapters.delete(chapters.keys().next().value!);
  }
  return pending;
}
export async function wordOccurrences(strong: string): Promise<string[]> {
  if (!/^[GH]\d{4}[A-Z]?$/.test(strong)) return [];
  const shard = strong.slice(0, 3);
  let pending = concordances.get(shard);
  if (!pending) {
    pending = json<Record<string, string[]>>(`concordance/${shard}`);
    concordances.set(shard, pending);
    pending.catch(() => concordances.delete(shard));
    if (concordances.size > 4)
      concordances.delete(concordances.keys().next().value!);
  }
  return (await pending)[strong] ?? [];
}
// STEP flags different source verse numbering. Do not silently pair that verse
// with the same number in a translation. The source reading remains accessible.
export function canPairOriginal(words: OriginalWord[]) {
  return words.length > 0 && words.every((word) => !word[6]);
}
