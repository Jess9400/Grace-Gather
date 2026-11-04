import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Screen, Button, colors, serif } from "../../components/quiet-ui";
import FloatingFeelings from "../../components/FloatingFeelings";
import { useApp } from "../../lib/state";
import { useQuiet } from "../../lib/quiet-state";
import { q } from "../../lib/quiet-copy";
export default function Home() {
  const { profile } = useApp();
  const { draft, update, clear } = useQuiet();
  return (
    <Screen>
      <Text style={s.date}>
        {new Date().toLocaleDateString(profile.language, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}{" "}
        · {q(profile.language, "moment")}
      </Text>
      <FloatingFeelings
        chosen={draft.chosen}
        onChange={(chosen) => update({ chosen })}
        language={profile.language}
      />
      <View style={s.actions}>
        <Button
          title={q(profile.language, "write")}
          onPress={() => router.push("/(tabs)/diary")}
        />
        {draft.entryId && (
          <Button
            secondary
            title={q(profile.language, "newPage")}
            onPress={() => {
              clear();
              router.push("/(tabs)/diary");
            }}
          />
        )}
        <Text style={s.whisper}>{q(profile.language, "whisper")}</Text>
      </View>
    </Screen>
  );
}
const s = StyleSheet.create({
  date: {
    fontSize: 11,
    letterSpacing: 1.2,
    textAlign: "center",
    textTransform: "uppercase",
    color: colors.muted,
    marginTop: 10,
  },
  actions: { gap: 17, marginTop: 8 },
  whisper: {
    textAlign: "center",
    fontFamily: serif,
    fontStyle: "italic",
    fontSize: 15,
    color: colors.muted,
  },
});
