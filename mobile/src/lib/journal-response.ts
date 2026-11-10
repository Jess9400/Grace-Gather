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
import { availableJournalAction } from "./journal-gathering";
import { gathering } from "./gatherings";

export async function resolveJournalResponse(
  entry: Entry,
  profile: Profile,
): Promise<JournalResponse> {
  if (entry.response) {
    if (entry.response.actionId !== "A25") return entry.response;
    const theme = journalTheme(entry);
    const safeAction = await availableJournalAction(theme.id, profile.language, entry.text, [], () => gathering("list"), true);
    if (safeAction === "A25") return entry.response;
    const copy = journalActionCopy(entry.prefs.language, theme.id, safeAction ?? "A08");
    return { ...entry.response, actionId: safeAction ?? "A08", actionTitle: copy.title, invitation: copy.invitation, actionPrompt: copy.prompt };
  }
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
  const proposed = journalAction(entry, profile);
  const actionId = proposed === "A25"
    ? (await availableJournalAction(theme.id, profile.language, entry.text, [], () => gathering("list"), true)) ?? "A08"
    : proposed;
  const lang = entry.prefs.language;
  const action = journalActionCopy(lang, theme.id, actionId);
  return {
    verse,
    actionId,
    actionTitle: action.title,
    invitation: action.invitation,
    actionPrompt: action.prompt,
  };
}
