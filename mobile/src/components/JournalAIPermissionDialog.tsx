import { useState } from "react";
import { useApp } from "../lib/state";
import type { Profile } from "../lib/content";
import { aiCopy, AI_CONSENT_VERSION } from "../lib/ai-copy";
import { Body, Button, Notice, Subheading } from "./quiet-ui";
import PreviewDialog from "./PreviewDialog";
import { saveJournalPermissionThenContinue } from "../lib/journal-ai-permission";

export default function JournalAIPermissionDialog({ visible, onClose, onAllowed, onWithout }: {
  visible: boolean;
  onClose: () => void;
  onAllowed: (profile: Profile) => void;
  onWithout?: () => void;
}) {
  const { profile, saveProfile } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const language = profile.language;
  async function allow() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await saveJournalPermissionThenContinue(profile, AI_CONSENT_VERSION, saveProfile, onAllowed);
    } catch {
      setError(aiCopy(language, "permissionFailed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <PreviewDialog visible={visible} busy={busy} onClose={onClose} closeLabel={aiCopy(language, "notNow")}>
      <Subheading>{aiCopy(language, "title")}</Subheading>
      <Body>{aiCopy(language, "benefit")}</Body>
      <Body small>{aiCopy(language, "permissionSummary")}</Body>
      <Notice text={error} />
      <Button title={aiCopy(language, "allowGuidance")} disabled={busy} loading={busy} onPress={() => void allow()} />
      <Button secondary title={aiCopy(language, onWithout ? "continueWithout" : "notNow")} disabled={busy} onPress={onWithout ?? onClose} />
    </PreviewDialog>
  );
}
