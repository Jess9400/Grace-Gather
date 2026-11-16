import { Platform } from "react-native";
import type { Language } from "./content";
import { themeReferenceFor } from "./journal-verse-reference";

type NoteRow = [number, number, string, string, "aquifer" | "biblica", string];
export type OpenStudyNote = {
  title: string;
  text: string;
  source: "aquifer" | "biblica";
  reviewLevel: string;
};
export type OpenStudyNotes = {
  detail?: OpenStudyNote;
  overview?: OpenStudyNote;
};
const cache = new Map<string, Promise<NoteRow[]>>();

/** Do not infer different editions' verse numbering. Only use explicit mappings. */
export function sourceReference(
  id: string,
): { book: string; chapter: number; verse: number } | null {
  const mapped = themeReferenceFor(id);
  const [edition, raw] = id.includes(":") ? id.split(":") : ["web", id];
  // Hebrew-numbered editions align with the notes. Other editions require an
  // explicit, verified cross-edition theme mapping (especially their Psalms).
  const verifiedMatos: Record<string, string> = {
    "GEN.1.1": "GEN.1.1",
    "GEN.1.2": "GEN.1.2",
    "GEN.1.3": "GEN.1.3",
    "JHN.3.16": "JHN.3.16",
  };
  // The individual verses of Genesis 1 were checked against both editions.
  const genesisOne = /^GEN\.1\.(\d+)$/.exec(raw);
  const verifiedGenesisOne =
    genesisOne && Number(genesisOne[1]) >= 1 && Number(genesisOne[1]) <= 31
      ? raw
      : undefined;
  const reference =
    mapped ??
    (edition === "matos"
      ? verifiedMatos[raw] ?? verifiedGenesisOne
      : ["web", "blivre", "rv1909"].includes(edition)
        ? raw
        : undefined);
  if (!reference) return null;
  const match = /^([1-3]?[A-Z]{2,3})\.(\d+)\.(\d+)$/.exec(reference);
  return match
    ? { book: match[1], chapter: Number(match[2]), verse: Number(match[3]) }
    : null;
}

/** Prefer the narrowest matching note; never attach a neighbouring verse's note. */
export function selectOpenStudyNotes(
  rows: NoteRow[],
  chapter: number,
  verse: number,
  language: Language = "en",
): OpenStudyNotes {
  const key = chapter * 1000 + verse;
  const select = (source: NoteRow[4]) => {
    const candidates = rows.filter(
      (row) => row[4] === source &&
        (row[5] === "Professional" || language === "pt" || language === "es") &&
        row[0] <= key && key <= row[1],
    );
    candidates.sort((a, b) => a[1] - a[0] - (b[1] - b[0]));
    const row = candidates[0];
    return row
      ? { title: row[2], text: row[3], source, reviewLevel: row[5] }
      : undefined;
  };
  return { detail: select("aquifer"), overview: select("biblica") };
}

export async function fetchOpenStudyNotes(
  id: string,
  language: Language,
): Promise<OpenStudyNotes | null> {
  const ref = sourceReference(id);
  if (!ref) return null;
  const key = `${language}/${ref.book}`;
  const base =
    Platform.OS === "web" ? "" : "https://grace-gather.findflockie.workers.dev";
  let request = cache.get(key);
  if (!request) {
    request = fetch(`${base}/study-notes/v1/${key}.json`).then(
      async (response) => {
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("json")
        )
          throw Error("study_notes_unavailable");
        const rows: unknown = await response.json();
        if (!Array.isArray(rows)) throw Error("study_notes_invalid");
        return rows as NoteRow[];
      },
    );
    cache.set(key, request);
    // Keep a handful of recently used books, not the entire library in memory.
    if (cache.size > 4) cache.delete(cache.keys().next().value!);
    const pending = request;
    request.catch(() => {
      if (cache.get(key) === pending) cache.delete(key);
    });
  }
  return selectOpenStudyNotes(await request, ref.chapter, ref.verse, language);
}
