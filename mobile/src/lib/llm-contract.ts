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
  return candidate;
}
export function maySendToLLM(request: JourneyRequest) {
  return (
    !!request.consentVersion &&
    !needsSupport((request.text ?? "") + " " + (request.transcript ?? ""))
  );
}
