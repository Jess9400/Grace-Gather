import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Body, Notice } from "./quiet-ui";
import { TextAction } from "./CommunityControls";
import { useApp } from "../lib/state";
import type { Entry } from "../lib/content";
import { suggestJourney } from "../lib/ai";
import { AI_CONSENT_VERSION } from "../lib/ai-copy";
import { resolveJournalResponse } from "../lib/journal-response";
import { communityCopy } from "../lib/community-copy";

export default function JournalGuidanceStatus({ entry }: { entry: Entry }) {
  const { profile, saveRetriedGuidance } = useApp();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const c = (key: string) => communityCopy(profile.language, key);
  if (!entry.aiUnavailable) return null;
  async function retry() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const settings = { ...profile, ...entry.prefs };
      const result = await suggestJourney(entry.text, settings);
      const next = {
        ...entry,
        response: undefined,
        mood: result.path,
        guidance: "ai" as const,
        safety: result.support,
        passageIds: result.passageIds,
        actionIds: result.actionIds,
        themeId: result.themeId,
        suggestedAction: result.suggestedAction,
        suggestedActionExplanation: result.actionExplanation,
      };
      const response = await resolveJournalResponse(next, settings);
      await saveRetriedGuidance(entry.id, entry.text, { ...next, response });
    } catch {
      setNotice(c("retryGuidanceFailed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 4 }}>
      <Body small>{c("guidanceUnavailable")}</Body>
      <Notice text={notice} />
      {profile.journalAIConsentVersion === AI_CONSENT_VERSION ? (
        <TextAction
          title={c("retryGuidance")}
          disabled={busy}
          onPress={() => void retry()}
        />
      ) : (
        <>
          <Body small>{c("enableGuidanceToRetry")}</Body>
          <TextAction
            title={c("openPreferences")}
            onPress={() => router.push("/preferences")}
          />
        </>
      )}
    </View>
  );
}
