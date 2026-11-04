import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Button,
  Body,
  Notice,
  colors,
  serif,
} from "../components/quiet-ui";
import { useApp } from "../lib/state";
import { Tradition } from "../lib/content";
import { q } from "../lib/quiet-copy";
export default function Onboarding() {
  const { profile, saveProfile } = useApp();
  const [choice, setChoice] = useState<Tradition | "exploring" | null>(
      profile.faithChoice === "unspecified"
        ? null
        : (profile.faithChoice ?? null),
    ),
    [about, setAbout] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lang = profile.language;
  async function finish(value: Tradition | "exploring" | "unspecified") {
    setBusy(true);
    setError("");
    try {
      await saveProfile({
        ...profile,
        faithChoice: value,
        tradition:
          value === "exploring" || value === "unspecified"
            ? profile.tradition
            : value,
        onboarded: true,
      });
      router.replace("/(tabs)");
    } catch {
      setError("Your choice could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const labels = {
    orthodox:
      lang === "ru"
        ? "Православие"
        : lang === "pt"
          ? "Ortodoxa"
          : lang === "es"
            ? "Ortodoxa"
            : "Orthodox",
    catholic:
      lang === "ru"
        ? "Католицизм"
        : lang === "pt"
          ? "Católica"
          : lang === "es"
            ? "Católica"
            : "Catholic",
    protestant:
      lang === "ru"
        ? "Протестантизм"
        : lang === "pt"
          ? "Protestante"
          : lang === "es"
            ? "Protestante"
            : "Protestant",
    exploring: q(lang, "exploring"),
  };
  return (
    <Screen>
      <View style={s.page}>
        <Ionicons name="leaf-outline" size={34} color={colors.gold} />
        <Text accessibilityRole="header" style={s.title}>
          {q(lang, "tradition")}
        </Text>
        <Body>{q(lang, "closest")}</Body>
        <View accessibilityRole="radiogroup" style={s.options}>
          {(["orthodox", "catholic", "protestant", "exploring"] as const).map(
            (value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={labels[value]}
                accessibilityState={{ checked: choice === value }}
                onPress={() => setChoice(value)}
                style={[s.option, choice === value && s.selected]}
              >
                <Text style={s.label}>{labels[value]}</Text>
                <Ionicons
                  name={
                    choice === value ? "radio-button-on" : "radio-button-off"
                  }
                  size={21}
                  color={colors.ink}
                />
              </Pressable>
            ),
          )}
        </View>
        <View style={{ alignSelf: "stretch" }}>
          <Button
            title={q(lang, "continue")}
            disabled={!choice || busy}
            onPress={() => choice && void finish(choice)}
          />
          <Button
            secondary
            title={q(lang, "skip")}
            disabled={busy}
            onPress={() => void finish("unspecified")}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: about }}
          onPress={() => setAbout(!about)}
          style={{ padding: 12 }}
        >
          <Text style={s.about}>{q(lang, "about")}</Text>
        </Pressable>
        {about && <Body small>{q(lang, "aboutText")}</Body>}
        <Notice text={error} />
      </View>
    </Screen>
  );
}
const s = StyleSheet.create({
  page: { alignItems: "center", gap: 20, paddingTop: 18, paddingBottom: 20 },
  title: {
    fontFamily: serif,
    fontSize: 36,
    lineHeight: 43,
    color: colors.ink,
    textAlign: "center",
    maxWidth: 460,
  },
  options: { alignSelf: "stretch", gap: 11, marginTop: 8 },
  option: {
    minHeight: 59,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#FFFFFFB8",
    borderRadius: 17,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selected: { backgroundColor: "#B28A3E14", borderColor: colors.ink },
  label: { fontSize: 18, color: colors.ink },
  about: { fontSize: 13, color: colors.muted, textDecorationLine: "underline" },
});
