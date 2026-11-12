import { copy, data, type Language, type Mood } from "./content";
export { pendingStep } from "./step-checkin";

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
