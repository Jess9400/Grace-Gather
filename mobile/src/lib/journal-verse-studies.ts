import studies from "../generated/journal-verse-studies.json";
import type { Language } from "./content";

// The same sections the verse screen shows from an English study, written for
// each journal theme verse in every interface language.
export interface JournalVerseStudy {
  simple: string;
  context: string;
  meaning: string;
  theology: string;
  today: string;
  question: string;
}

const verses: Record<
  string,
  Record<Language, JournalVerseStudy>
> = studies.verses;

// Keyed by the theme map's reference (e.g. "PSA.42.11"), not by the number an
// edition prints: these explanations quote no edition and fit every one.
export function journalVerseStudy(
  reference: string | undefined,
  language: Language,
): JournalVerseStudy | undefined {
  if (!reference || !Object.hasOwn(verses, reference)) return undefined;
  return verses[reference][language] ?? verses[reference].en;
}
