import { requireUser } from "./backend";
import { welcomesCandles } from "./church-calendar";
import { Profile } from "./content";
import { validateSuggestion } from "./llm-contract";
import { AI_CONSENT_VERSION } from "./ai-copy";
export async function suggestJourney(text: string, preferences: Profile) {
  const { client } = await requireUser();
  const { data, error } = await client.functions.invoke("llm-journey", {
    body: {
      text,
      preferences: {
        language: preferences.language,
        scriptureLanguage: preferences.scriptureLanguage,
        tradition: preferences.tradition,
        edition: preferences.edition,
        candlePractice: welcomesCandles(preferences),
      },
      consentVersion: AI_CONSENT_VERSION,
    },
  });
  if (error) throw Error("ai_unavailable");
  if (typeof data?.support !== "boolean") throw Error("invalid_response");
  if (data.support)
    return {
      path: "unsure" as const,
      passageIds: [],
      actionIds: [],
      support: true,
    };
  return { ...validateSuggestion(data, preferences), support: false };
}
