import { Platform } from "react-native";

// «Толковая Библия» под ред. А. П. Лопухина и преемников (СПб., 1904–1913),
// public domain. Only books whose commentator is clearly in the public domain
// are published (docs/content-rights/lopukhin.md). Its verse numbers are the
// Synodal ones, so it is shown only for the Synodal Bible.
type Row = [first: number, last: number, text: string];
export type LopukhinNote = { verse?: string; chapter?: string };

export const LOPUKHIN_BOOKS = [
  "MAT", "MRK", "LUK", "JHN", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL",
  "1TI", "2TI", "TIT", "PHM", "JER", "LAM", "MAL", "JOS", "JDG", "1CH", "JOB",
  "DAN", "ECC", "EZR", "NEH", "HOS", "JOL", "AMO", "OBA", "MIC",
];
export const LOPUKHIN_CREDIT =
  "Толковая Библия под ред. А. П. Лопухина и преемников (СПб., 1904–1913). Текст в общественном достоянии.";
export const LOPUKHIN_NOTE =
  "Толкование дореволюционного издания: оно передаёт взгляды и язык своего времени и не заменяет учения Церкви.";

const cache = new Map<string, Promise<Row[]>>();

export function lopukhinReference(id: string) {
  const match = /^synodal:([1-3]?[A-Z]{2,3})\.(\d+)\.(\d+)$/.exec(id);
  if (!match || !LOPUKHIN_BOOKS.includes(match[1])) return null;
  return { book: match[1], chapter: Number(match[2]), verse: Number(match[3]) };
}

/** The narrowest note on this verse, and the chapter's introduction. */
export function selectLopukhin(rows: Row[], chapter: number, verse: number): LopukhinNote {
  const key = chapter * 1000 + verse;
  const verses = rows
    .filter(([first, last]) => first % 1000 !== 0 && first <= key && key <= last)
    .sort((a, b) => a[1] - a[0] - (b[1] - b[0]));
  const intro = rows.find(([first]) => first === chapter * 1000);
  return { verse: verses[0]?.[2], chapter: intro?.[2] };
}

export async function fetchLopukhin(id: string): Promise<LopukhinNote | null> {
  const ref = lopukhinReference(id);
  if (!ref) return null;
  const base =
    Platform.OS === "web" ? "" : "https://grace-gather.findflockie.workers.dev";
  let request = cache.get(ref.book);
  if (!request) {
    request = fetch(`${base}/study-notes/v1/lopukhin/${ref.book}.json`).then(
      async (response) => {
        if (!response.ok || !response.headers.get("content-type")?.includes("json"))
          throw Error("lopukhin_unavailable");
        const rows: unknown = await response.json();
        if (!Array.isArray(rows)) throw Error("lopukhin_invalid");
        return rows as Row[];
      },
    );
    cache.set(ref.book, request);
    if (cache.size > 3) cache.delete(cache.keys().next().value!);
    const pending = request;
    request.catch(() => {
      if (cache.get(ref.book) === pending) cache.delete(ref.book);
    });
  }
  return selectLopukhin(await request, ref.chapter, ref.verse);
}
