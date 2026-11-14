import { useState } from "react";
import { View, Text, Pressable, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { Notice } from "./quiet-ui";
import { useApp } from "../lib/state";
import { useQuiet } from "../lib/quiet-state";
import { pendingStep } from "../lib/small-step";
import { jc } from "../lib/journal-copy";
import { copy } from "../lib/content";

// A private invitation after a chosen action, without a completion requirement.
type InvitationStyles = {
  grabHandle: StyleProp<ViewStyle>;
  title: StyleProp<TextStyle>;
  primary: StyleProp<ViewStyle>;
  primaryText: StyleProp<TextStyle>;
  secondary: StyleProp<ViewStyle>;
  secondaryText: StyleProp<TextStyle>;
};

export function StepCheckIn({ styles }: { styles: InvitationStyles }) {
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
    <View style={{ gap: 10 }}>
      <View accessibilityElementsHidden importantForAccessibility="no" style={styles.grabHandle} />
      <Text accessibilityRole="header" style={styles.title}>
        {jc(profile.language, "weekly")}
      </Text>
      <Text style={[styles.secondaryText, { textAlign: "center", lineHeight: 21 }]}>
        {jc(profile.language, "weeklyIntro")}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void respond(true)}
        style={[styles.primary, busy && { opacity: 0.6 }]}
      >
        <Text style={styles.primaryText}>{jc(profile.language, "reflect")}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void respond(false)}
        style={[styles.secondary, busy && { opacity: 0.6 }]}
      >
        <Text style={styles.secondaryText}>{jc(profile.language, "later")}</Text>
      </Pressable>
      <Notice text={error} />
    </View>
  );
}
