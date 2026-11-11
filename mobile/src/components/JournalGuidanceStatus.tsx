import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Body, Button, Card, Notice, Subheading } from "./quiet-ui";
import { TextAction } from "./CommunityControls";
import SignInForm from "./SignInForm";
import { useApp } from "../lib/state";
import type { Entry } from "../lib/content";
import { suggestJourney } from "../lib/ai";
import { AI_CONSENT_VERSION } from "../lib/ai-copy";
import { isEarlyPrayer, useSignedIn } from "../lib/account";
import { resolveJournalResponse } from "../lib/journal-response";
import { communityCopy } from "../lib/community-copy";

// Above a saved prayer that has no personal reply yet. Without an account it
// offers, on someone's first few prayers only, to add an email; once they do,
// the reply to this prayer is written at once. With an account it explains
// that the reply could not be written just now and lets them try again.
export default function JournalGuidanceStatus({ entry }: { entry: Entry }) {
  const { profile, entries, saveRetriedGuidance } = useApp();
  const signedIn = useSignedIn();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [adding, setAdding] = useState(false);
  const [later, setLater] = useState(false);
  const wantsReply = useRef(false);
  const c = (key: string) => communityCopy(profile.language, key);
  const enabled = profile.journalAIConsentVersion === AI_CONSENT_VERSION;
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
  // Signing in from the card (by code or Apple) writes this prayer's reply.
  useEffect(() => {
    if (signedIn && wantsReply.current && entry.aiUnavailable) {
      wantsReply.current = false;
      setAdding(false);
      void retry();
    }
    // retry reads the latest entry and profile on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, entry.aiUnavailable]);
  if (!entry.aiUnavailable || signedIn === null) return null;
  if (busy) return <Body small>{c("replyWriting")}</Body>;
  if (!signedIn) {
    if (!enabled || later || !isEarlyPrayer(entries, entry.id)) return null;
    return (
      <Card>
        <Subheading>{c("replyCardTitle")}</Subheading>
        <Body small>{c("replyCardBody")}</Body>
        <Notice text={notice} />
        {adding ? (
          <SignInForm />
        ) : (
          <Button
            title={c("replyCardAdd")}
            onPress={() => {
              wantsReply.current = true;
              setAdding(true);
            }}
          />
        )}
        <TextAction
          title={c("replyCardLater")}
          onPress={() => setLater(true)}
        />
      </Card>
    );
  }
  return (
    <View style={{ gap: 4 }}>
      <Body small>{c("guidanceUnavailable")}</Body>
      <Notice text={notice} />
      {enabled ? (
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
