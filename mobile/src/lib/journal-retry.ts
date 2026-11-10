import type { Entry } from "./content";

/** Called under the journal lock; never overwrite an edited or deleted entry. */
export function applyRetriedGuidance(
  all: Entry[],
  id: string,
  expectedText: string,
  guidance: Partial<Entry>,
): Entry[] {
  const current = all.find((entry) => entry.id === id && !entry.deletedAt);
  if (!current || current.text !== expectedText || !current.aiUnavailable)
    throw Error("entry_changed");
  return all.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          guidance: guidance.guidance,
          mood: guidance.mood ?? entry.mood,
          safety: guidance.safety ?? entry.safety,
          passageIds: guidance.passageIds,
          actionIds: guidance.actionIds,
          themeId: guidance.themeId,
          suggestedAction: guidance.suggestedAction,
          suggestedActionExplanation: guidance.suggestedActionExplanation,
          response: guidance.response,
          aiUnavailable: false,
        }
      : entry,
  );
}
