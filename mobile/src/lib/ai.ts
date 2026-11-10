import { requireUser } from "./backend";
import { welcomesCandles } from "./church-calendar";
import { Profile } from "./content";
import { validateSuggestion } from "./llm-contract";
import { AI_CONSENT_VERSION } from "./ai-copy";
import { aiRequestError } from "./ai-error";
import { availableJournalAction } from "./journal-gathering";
import { gathering } from "./gatherings";
export async function suggestJourney(text: string, preferences: Profile) {
  if (preferences.journalAIConsentVersion !== AI_CONSENT_VERSION)
    throw Error("consent_required");
  const { client } = await requireUser();
  const { data, error } = await client.functions.invoke("llm-journey", {
    body: {
      text,
      supportsConnectedActions: true,
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
  if (error) throw await aiRequestError(error);
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

export async function continueJournal(
  entry: import("./content").Entry,
  preferences: Profile,
  messages: import("./content").JournalMessage[],
  previousActions: string[],
) {
  if (preferences.journalAIConsentVersion !== AI_CONSENT_VERSION)
    throw Error("consent_required");
  const { client } = await requireUser();
  const { data, error } = await client.functions.invoke("llm-journey", {
    body: {
      mode: "conversation",
      supportsGatheringAction: true,
      includeActionTheme: true,
      includeActionExplanation: true,
      supportsConnectedActions: true,
      text: entry.text,
      consentVersion: AI_CONSENT_VERSION,
      preferences: {
        ...entry.prefs,
        language: preferences.language,
        candlePractice: welcomesCandles(preferences),
      },
      messages: messages
        .slice(-11)
        .map((m) => ({ role: m.role, content: m.content })),
      previousActions,
    },
  });
  if (error) throw await aiRequestError(error);
  if (typeof data?.support !== "boolean") throw Error("ai_unavailable");
  if (data.support) return { content: "", support: true };
  const allowed = [
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
  ];
  if (
    typeof data.reply !== "string" ||
    !data.reply.trim() ||
    data.reply.length > 2000 ||
    (data.actionId != null && !allowed.includes(data.actionId))
  )
    throw Error("invalid_response");
  const latest = messages.at(-1)?.content ?? "";
  const selected = data.actionId === "A25"
    ? await availableJournalAction(typeof data.actionTheme === "string" ? data.actionTheme : "", preferences.language, latest, previousActions, () => gathering("list"), false)
    : data.actionId;
  return {
    content: data.reply,
    actionId: previousActions.includes(selected) ? undefined : (selected ?? undefined),
    actionExplanation: selected && selected === data.actionId && !previousActions.includes(selected) && typeof data.actionExplanation === "string" && data.actionExplanation.trim().length > 0 && data.actionExplanation.length <= 240 && !/[\r\n<>]|https?:\/\/|www\./i.test(data.actionExplanation) ? data.actionExplanation.trim() : undefined,
  };
}
