import journalMap from "../generated/journal-map.json";
import { Mood, Preferences, data, passagesFor, needsSupport } from "./content";
export interface JourneyRequest {
  consentVersion: string;
  text?: string;
  transcript?: string;
  preferences: Preferences;
}
export interface JourneySuggestion {
  path: Mood;
  passageIds: string[];
  actionIds: string[];
  themeId?: string;
  suggestedAction?: string;
  actionExplanation?: string;
}
// The provider may select approved identifiers; it cannot invent Bible quotations.
export function validateSuggestion(
  value: unknown,
  prefs: Preferences,
): JourneySuggestion {
  if (!value || typeof value !== "object")
    throw new Error("Invalid journey response");
  const candidate = value as JourneySuggestion;
  if (
    !Object.hasOwn(data.PATHS, candidate.path) ||
    !Array.isArray(candidate.passageIds) ||
    !Array.isArray(candidate.actionIds)
  )
    throw new Error("Unknown journey path");
  const verses = passagesFor(prefs, candidate.path),
    actions = data.PATHS[candidate.path].actions;
  if (
    candidate.passageIds.length > 2 ||
    candidate.actionIds.length > 3 ||
    candidate.passageIds.some((id) => !verses.some((v) => v.id === id)) ||
    candidate.actionIds.some((id) => !actions.includes(id))
  )
    throw new Error("Unapproved recommendation");
  if (
    candidate.themeId !== undefined &&
    !journalMap.some((t) => t.id === candidate.themeId)
  )
    throw new Error("Unapproved theme");
  if (
    candidate.suggestedAction !== undefined &&
    ![
      "A01",
      "A02",
      "A03",
      "A04",
      "A05",
      "A07",
      "A08",
      "A09",
      "A10",
      "A11",
      "A12",
      "A14",
      "A15",
      "A16",
      "A18",
      "A19",
      "A20",
      "A21",
      "A25",
      "A26",
      "A27",
    ].includes(candidate.suggestedAction)
  )
    throw new Error("Unapproved action");
  return {
    ...candidate,
    actionExplanation: typeof candidate.actionExplanation === "string" && candidate.actionExplanation.trim().length > 0 && candidate.actionExplanation.length <= 240 && !/[\r\n<>]|https?:\/\/|www\./i.test(candidate.actionExplanation) ? candidate.actionExplanation.trim() : undefined,
    passageIds: candidate.passageIds.slice(0, 1),
    actionIds: candidate.actionIds.slice(0, 1),
  };
}
export function maySendToLLM(request: JourneyRequest) {
  return (
    !!request.consentVersion &&
    !needsSupport((request.text ?? "") + " " + (request.transcript ?? ""))
  );
}
