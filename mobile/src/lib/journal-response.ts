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
import { journalVerseFor } from "./journal-verse-path";
import { journalActionCopy } from "./journal-copy";
import { journalScripture } from "./journal-verse-reference";
import { availableJournalAction } from "./journal-gathering";
import { gathering } from "./gatherings";

export async function resolveJournalResponse(
  entry: Entry,
  profile: Profile,
  journal: Entry[] = [],
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
  // A path step this edition does not carry falls back to the theme's verse.
  const references = [...new Set([journalVerseFor(entry, journal, theme), theme.verse])];
  let verse: ReadingVerse | null = null,
    reference: string | undefined;
  for (const candidate of references) {
    if (entry.safety || verse) break;
    if (collection) {
      try {
        await ensureCollection(collection);
        verse = journalScripture(collection, candidate);
      } catch {
        /* Use the licensed, bundled fallback if a collection cannot load. */
      }
    }
    if (!verse) verse = themeVerse(entry.prefs, candidate);
    if (verse) reference = candidate;
  }
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
    reference,
    actionId,
    actionTitle: action.title,
    invitation: entry.suggestedAction === actionId && typeof entry.suggestedActionExplanation === "string" && entry.suggestedActionExplanation.trim() && entry.suggestedActionExplanation.length <= 240 ? entry.suggestedActionExplanation : action.invitation,
    actionPrompt: action.prompt,
  };
}
