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
import { actionInvitation, jc, type JournalCopyKey } from "./journal-copy";

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
      if (
        !theme.verse.startsWith("PSA.") ||
        ["web", "blivre", "rv1909"].includes(collection)
      )
        verse = getReadingVerse(`${collection}:${theme.verse}`);
    } catch {
      /* Use the licensed, bundled fallback if a collection cannot load. */
    }
  }
  if (!entry.safety && !collection)
    verse = themeVerse(entry.prefs, theme.verse);
  if (!entry.safety && !verse) {
    const candidates = passagesFor(entry.prefs, entry.mood);
    const fallback =
      candidates.find((v) => entry.passageIds?.includes(v.id)) ?? candidates[0];
    if (fallback) verse = getReadingVerse(fallback.id);
  }
  const actionId = journalAction(entry, profile),
    lang = entry.prefs.language;
  const hope = theme.id === "hopelessness" && actionId === "A08";
  return {
    verse,
    actionId,
    actionTitle: jc(lang, hope ? "hopeAction" : (actionId as JournalCopyKey)),
    invitation: hope ? jc(lang, "hopeIntro") : actionInvitation(lang, actionId),
  };
}
