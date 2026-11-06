import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Glass, colors, serif } from "./quiet-ui";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { useApp } from "../lib/state";
import { churchCopy, type ChurchWord } from "../lib/church-copy";
import { pendingStep, stepOptions, stepTitle } from "../lib/small-step";
import type { Entry } from "../lib/content";

// Below the verse: pick one curated small step for today, saved with the page.
export function SmallStepPicker({ entry }: { entry: Entry }) {
  const { profile, saveEntry } = useApp();
  const tr = useInterfaceCopy();
  const [showAll, setShowAll] = useState(false);
  const t = (key: ChurchWord) => churchCopy(profile.language, key);
  const options = stepOptions(entry.mood, profile.language);
  const [choice, setChoice] = useState<string | null>(entry.step?.id ?? null);
  const [editing, setEditing] = useState(!entry.step);
  if (!options.length) return null;
  const chosen = options.find((o) => o.id === entry.step?.id);

  if (!editing && chosen)
    return (
      <Glass style={s.card}>
        <Text style={s.eyebrow}>{t("stepChosen").toUpperCase()}</Text>
        <Text style={s.title}>{chosen.title}</Text>
        <Text style={s.how}>{chosen.how}</Text>
        {entry.sessionOnly && <Text style={s.note}>{t("stepKeepNote")}</Text>}
        <Pressable
          accessibilityRole="button"
          onPress={() => setEditing(true)}
          style={s.link}
        >
          <Text style={s.linkText}>{t("stepChange")}</Text>
        </Pressable>
      </Glass>
    );

  return (
    <Glass style={s.card}>
      <Text accessibilityRole="header" style={s.heading}>
        {t("stepTitle")}
      </Text>
      <Text style={s.intro}>{t("stepIntro")}</Text>
      <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
        {(showAll ? options : options.slice(0, 1)).map((o) => {
          const on = choice === o.id;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${o.title}. ${o.description}. ${o.time}`}
              onPress={() => setChoice(o.id)}
              style={({ pressed }) => [
                s.option,
                on && s.optionOn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={s.optionTop}>
                <Text style={[s.optionTitle, on && { color: colors.white }]}>
                  {o.title}
                </Text>
                <Text style={[s.time, on && { color: "#E9E1D3" }]}>
                  {o.time}
                </Text>
              </View>
              <Text style={[s.desc, on && { color: "#E9E1D3" }]}>
                {on ? o.how : o.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!showAll && options.length > 1 && (
        <Button
          secondary
          title={tr("See other options")}
          onPress={() => setShowAll(true)}
        />
      )}
      <Button
        title={t("stepSave")}
        disabled={!choice}
        onPress={() => {
          if (!choice) return;
          setEditing(false);
          void saveEntry({
            ...entry,
            step: { id: choice, chosenAt: new Date().toISOString() },
          });
        }}
      />
    </Glass>
  );
}

// On Home: a gentle question about the last unanswered step. No streaks.
export function StepCheckIn() {
  const { profile, entries, saveEntry } = useApp();
  const t = (key: ChurchWord) => churchCopy(profile.language, key);
  const [answered, setAnswered] = useState<{
    title: string;
    status: "done" | "notYet";
  } | null>(null);
  const pending = pendingStep(entries, new Date());
  if (!pending && !answered) return null;

  if (answered)
    return (
      <View style={s.home} accessibilityLiveRegion="polite">
        <Text style={s.eyebrow}>{answered.title.toUpperCase()}</Text>
        <Text style={s.reply}>
          {answered.status === "done" ? t("stepDone") : t("stepLater")}
        </Text>
        <Text style={s.note}>{t("stepNoPressure")}</Text>
      </View>
    );

  const { entry, step, when } = pending!;
  const label = t(
    when === "today"
      ? "stepToday"
      : when === "yesterday"
        ? "stepYesterday"
        : "stepEarlier",
  );
  const answer = (status: "done" | "notYet") => {
    setAnswered({ title: label, status });
    void saveEntry({
      ...entry,
      step: { ...step, status, checkedAt: new Date().toISOString() },
    });
  };
  return (
    <View style={s.home}>
      <View style={s.homeTop}>
        <Ionicons name="leaf-outline" size={18} color={colors.goldInk} />
        <Text style={s.eyebrow}>{label.toUpperCase()}</Text>
      </View>
      <Text style={s.title}>{stepTitle(step.id, profile.language)}</Text>
      <View style={s.answers}>
        <View style={{ flex: 1 }}>
          <Button title={t("stepDid")} onPress={() => answer("done")} />
        </View>
        {when !== "today" && (
          <View style={{ flex: 1 }}>
            <Button
              secondary
              title={t("stepNotYet")}
              onPress={() => answer("notYet")}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 20, gap: 12, width: "96%" },
  heading: {
    fontFamily: serif,
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
  },
  intro: { fontSize: 14, lineHeight: 20, color: colors.muted },
  option: {
    padding: 14,
    borderRadius: 16,
    gap: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E5DCCB",
  },
  optionOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  optionTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  optionTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.ink },
  time: { fontSize: 12, color: colors.muted },
  desc: { fontSize: 14, lineHeight: 20, color: colors.muted },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "600",
    color: colors.goldInk,
  },
  title: { fontFamily: serif, fontSize: 20, lineHeight: 27, color: colors.ink },
  how: { fontSize: 15, lineHeight: 22, color: colors.ink },
  note: { fontSize: 13, lineHeight: 19, color: colors.muted },
  link: { minHeight: 40, justifyContent: "center", alignSelf: "flex-start" },
  linkText: {
    fontSize: 14,
    color: colors.goldInk,
    textDecorationLine: "underline",
  },
  home: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 18,
    gap: 10,
    boxShadow: "0 1px 2px rgba(48,44,40,0.05), 0 8px 24px rgba(48,44,40,0.06)",
  },
  homeTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  answers: { flexDirection: "row", gap: 10, marginTop: 2 },
  reply: { fontSize: 15, lineHeight: 22, color: colors.ink },
});
