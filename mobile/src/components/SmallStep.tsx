import { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { Button, Notice } from "./quiet-ui";
import { useApp } from "../lib/state";
import { useQuiet } from "../lib/quiet-state";
import { pendingStep } from "../lib/small-step";
import { jc } from "../lib/journal-copy";
import { copy } from "../lib/content";

// A private invitation after a chosen action, without a completion requirement.
export function StepCheckIn({ dark = false }: { dark?: boolean }) {
  const { entries, profile, acknowledgeJournalStep } = useApp();
  const { clear } = useQuiet();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = pendingStep(entries, new Date());
  if (!pending) return null;
  async function respond(write: boolean) {
    setBusy(true);
    try {
      await acknowledgeJournalStep(pending!.entry.id, pending!.step.chosenAt);
      if (write) {
        clear();
        router.push("/(tabs)/diary");
      }
    } catch {
      setError(copy(profile.language, "storageError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <Text
        style={{
          fontSize: 24,
          lineHeight: 32,
          color: dark ? "#FFFCF3" : "#302C28",
        }}
      >
        {jc(profile.language, "weekly")}
      </Text>
      <Text
        style={{
          fontSize: 16,
          lineHeight: 24,
          color: dark ? "#FFFCF3" : "#746B61",
        }}
      >
        {jc(profile.language, "weeklyIntro")}
      </Text>
      <Button
        title={jc(profile.language, "reflect")}
        disabled={busy}
        onPress={() => void respond(true)}
      />
      <Button
        title={jc(profile.language, "later")}
        secondary
        disabled={busy}
        onPress={() => void respond(false)}
      />
      <Notice text={error} />
    </View>
  );
}
