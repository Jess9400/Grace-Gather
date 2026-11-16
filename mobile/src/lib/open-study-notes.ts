import { Platform } from "react-native";
import type { Language } from "./content";
import { themeReferenceFor } from "./journal-verse-reference";
import synodalNewTestament from "./synodal-nt-chapters.json";

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
  // Matos Soares and Bíblia Livre were compared verse by verse for these
  // chapters. Equal chapter length alone is not evidence of equivalence.
  // Gênesis 5:31 combines two verses, so only 5:1–30 are included.
  const verifiedGenesisChapters: Record<number, number> = {
    1: 31, 2: 25, 3: 24, 4: 26, 5: 30, 6: 22,
    7: 24, 8: 22, 9: 29, 10: 32, 11: 32,
  };
  // Different wording or verse boundaries can matter to commentary even when
  // the chapter lengths agree, so omit these until individually resolved.
  const unmatchedGenesis = new Set([
    "GEN.8.4", "GEN.8.6", "GEN.8.7",
    "GEN.10.15", "GEN.10.16", "GEN.10.17", "GEN.11.13",
  ]);
  const genesis = /^GEN\.(\d+)\.(\d+)$/.exec(raw);
  const verifiedGenesis =
    genesis && !unmatchedGenesis.has(raw) && Number(genesis[2]) >= 1 &&
    Number(genesis[2]) <= (verifiedGenesisChapters[Number(genesis[1])] ?? 0)
      ? raw
      : undefined;
  // The Synodal New Testament was compared with the World English Bible
  // chapter by chapter: in these chapters every verse has the same number
  // (the English only leaves out Luke 17:36, Acts 8:37, 15:34 and 24:7).
  // Acts 19 and 2 Corinthians 11 and 13 divide verses differently and are
  // not included. The Synodal Old Testament is not matched.
  const nt = /^([1-3]?[A-Z]{2,3})\.(\d+)\.\d+$/.exec(raw);
  const synodalAligned =
    edition === "synodal" &&
    !!nt &&
    (synodalNewTestament as Record<string, number[]>)[nt[1]]?.includes(
      Number(nt[2]),
    );
  const reference =
    mapped ??
    (synodalAligned ? raw : undefined) ??
    (edition === "matos"
      ? verifiedMatos[raw] ?? verifiedGenesis
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
