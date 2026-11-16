import data from "./bible-study-translations.json";
import { studyFor } from "./bible";
import type { Language } from "./content";
import type { JournalVerseStudy } from "./journal-verse-studies";

// Some Bible-tab studies were written in English only. Their Portuguese,
// Spanish and Russian versions live here, in the same shape as the journal
// notes, so the verse screen shows them the same way: related verses are read
// from the reader's own Bible. The English study stays the English one.
type Sections = Omit<JournalVerseStudy, "echoes" | "sources">;
interface Entry {
  // Where the verse sits in each Bible (Septuagint/Vulgate Psalm numbers
  // included), besides the English study's own aliases.
  verses: string[];
  echoes: NonNullable<JournalVerseStudy["echoes"]>;
  sources: NonNullable<JournalVerseStudy["sources"]>;
  languages: Partial<Record<Language, Sections>>;
}
const entries = data.studies as Record<string, Entry>;

function entryFor(verseId: string): Entry | undefined {
  const own = studyFor(verseId)?.id;
  if (own && Object.hasOwn(entries, own)) return entries[own];
  return Object.values(entries).find((entry) => entry.verses.includes(verseId));
}

export function translatedStudy(
  verseId: string,
  language: Language,
): JournalVerseStudy | undefined {
  if (language === "en") return undefined;
  const entry = entryFor(verseId);
  const sections = entry?.languages[language];
  if (!entry || !sections) return undefined;
  return { ...sections, echoes: entry.echoes, sources: entry.sources };
}
