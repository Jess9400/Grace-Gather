import { copy, data, type Entry, type Language, type Mood } from "./content";
import { localDay } from "./church-calendar";

export type SmallStep = {
  id: string;
  chosenAt: string;
  status?: "done" | "notYet";
  checkedAt?: string;
};

export type StepOption = {
  id: string;
  title: string;
  description: string;
  how: string;
  time: string;
};

// The three curated steps for a feeling, in the person's language.
export function stepOptions(mood: Mood, language: Language): StepOption[] {
  const ids = (data.PATHS[mood]?.actions ?? []) as string[];
  return ids
    .filter((id) => Object.hasOwn(data.ACTIONS, id))
    .map((id) => {
      const action = data.ACTIONS[id as keyof typeof data.ACTIONS] as {
        time: string;
      };
      return {
        id,
        title: copy(language, id),
        description: copy(language, `${id}Desc`),
        how: copy(language, `${id}Body`),
        time: copy(language, action.time),
      };
    });
}

export function stepTitle(id: string, language: Language) {
  return copy(language, id);
}

// The most recent kept page whose small step has not been answered yet, from
// the last week. Steps chosen today can be marked done; earlier ones are asked
// about gently. Pages that were not kept are never stored, so they never ask.
export function pendingStep(entries: Entry[], now: Date) {
  const today = localDay(now);
  const weekAgo = now.getTime() - 7 * 86400000;
  for (const entry of entries) {
    const step = entry.step;
    if (!step || step.status || entry.sessionOnly) continue;
    const chosen = new Date(step.chosenAt);
    if (chosen.getTime() < weekAgo) continue;
    const day = localDay(chosen);
    const yesterday = localDay(new Date(now.getTime() - 86400000));
    return {
      entry,
      step,
      when:
        day === today
          ? ("today" as const)
          : day === yesterday
            ? ("yesterday" as const)
            : ("earlier" as const),
    };
  }
  return null;
}
