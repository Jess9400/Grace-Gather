import {
  passagesFor,
  type Entry,
  type Profile,
  type JournalResponse,
} from "./content";
import {
  collectionFor,
  ensureCollection,
  getReadingVerse,
  themeVerse,
  type ReadingVerse,
} from "./bible";
import { journalAction, journalTheme } from "./journal-guidance";
import { journalActionCopy } from "./journal-copy";
import { journalScripture } from "./journal-verse-reference";

export async function resolveJournalResponse(
  entry: Entry,
  profile: Profile,
): Promise<JournalResponse> {
  if (entry.response) return entry.response;
  const theme = journalTheme(entry),
    collection = collectionFor(entry.prefs);
  let verse: ReadingVerse | null = null;
  if (!entry.safety && collection) {
    try {
      await ensureCollection(collection);
      verse = journalScripture(collection, theme.verse);
    } catch {
      /* Use the licensed, bundled fallback if a collection cannot load. */
    }
  }
  if (!entry.safety && !verse) verse = themeVerse(entry.prefs, theme.verse);
  if (!entry.safety && !verse) {
    const candidates = passagesFor(entry.prefs, entry.mood);
    const fallback =
      candidates.find((v) => entry.passageIds?.includes(v.id)) ?? candidates[0];
    if (fallback) verse = getReadingVerse(fallback.id);
  }
  const actionId = journalAction(entry, profile),
    lang = entry.prefs.language;
  const action = journalActionCopy(lang, theme.id, actionId);
  return {
    verse,
    actionId,
    actionTitle: action.title,
    invitation: action.invitation,
    actionPrompt: action.prompt,
  };
}
