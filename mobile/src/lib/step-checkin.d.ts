import type { Entry } from "./content";
import type { SmallStep } from "./small-step";
export function pendingStep(
  entries: Entry[],
  now?: Date,
): { entry: Entry; step: SmallStep } | null;
