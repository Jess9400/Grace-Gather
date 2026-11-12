import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Body,
  Button,
  Card,
  Field,
  Heading,
  Screen,
  Subheading,
  colors,
  serif,
} from "../components/quiet-ui";
import CandleView from "../components/CandleView";
import { useApp } from "../lib/state";
import { data, type Mood } from "../lib/content";
import { selectQuietPassage } from "../generated/quiet-diary";
import { churchCopy, type ChurchWord } from "../lib/church-copy";
import {
  lightCandle,
  loadCandles,
  useCandles,
  type CandleIntention,
} from "../lib/candles";

const INTENTIONS: {
  id: CandleIntention;
  title: ChurchWord;
  sub: ChurchWord;
  prayer: ChurchWord;
  mood: Mood;
}[] = [
  { id: "me", title: "me", sub: "meSub", prayer: "prayerMe", mood: "sad" },
  {
    id: "love",
    title: "loved",
    sub: "lovedSub",
    prayer: "prayerLove",
    mood: "lonely",
  },
  {
    id: "carry",
    title: "carry",
    sub: "carrySub",
    prayer: "prayerCarry",
    mood: "anxious",
  },
  {
    id: "thanks",
    title: "thanks",
    sub: "thanksSub",
    prayer: "prayerThanks",
    mood: "grateful",
  },
];

export default function CandleScreen() {
  const { profile } = useApp();
  const t = (key: ChurchWord) => churchCopy(profile.language, key);
  const candles = useCandles();
  const [phase, setPhase] = useState<"idle" | "choosing" | "lit">("idle");
  const [choice, setChoice] = useState<CandleIntention | null>(null);
  const [name, setName] = useState("");
  useEffect(() => {
    void loadCandles();
  }, []);
  const chosen = INTENTIONS.find((i) => i.id === choice);
  const verse = chosen
    ? selectQuietPassage(data.editions, profile, chosen.mood)
    : null;
  const who = name.trim();
  const prayer = chosen
    ? t(chosen.prayer).replace("{name}", who || t("prayerLoveNoName"))
    : "";

  const light = async () => {
    if (!choice) return;
    setPhase("lit");
    await lightCandle(choice, name);
  };

  return (
    <Screen back place="candles">
      <View style={s.head}>
        <Heading>{phase === "lit" ? t("lit") : t("candleTitle")}</Heading>
        <Body>
          {phase === "lit"
            ? who
              ? `${t("burningFor")} ${who} ${t("untilMidnight")}`
              : t("burning") + "."
            : t("candleIntro")}
        </Body>
      </View>

      <CandleView
        lit={phase === "lit"}
        label={t("candleScene")}
        hint={phase === "idle" ? t("tapToLight") : undefined}
        onPress={phase === "idle" ? () => setPhase("choosing") : undefined}
      />

      {phase === "choosing" && (
        <View style={s.section}>
          <Subheading>{t("whoFor")}</Subheading>
          <View accessibilityRole="radiogroup" style={s.options}>
            {INTENTIONS.map((i) => {
              const selected = choice === i.id;
              return (
                <Pressable
                  key={i.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setChoice(i.id)}
                  style={({ pressed }) => [
                    s.option,
                    selected && s.optionOn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[s.optionTitle, selected && { color: colors.white }]}
                  >
                    {t(i.title)}
                  </Text>
                  <Text style={[s.optionSub, selected && { color: "#665D54" }]}>
                    {t(i.sub)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {choice && (
            <>
              <Field
                label={t("nameLabel")}
                value={name}
                onChangeText={setName}
                maxLength={60}
                autoCapitalize="words"
              />
              <Body small>{t("namePrivate")}</Body>
            </>
          )}
          <Button
            title={t("lightIt")}
            disabled={!choice}
            onPress={() => void light()}
          />
        </View>
      )}

      {phase === "lit" && chosen && (
        <Card>
          <Text style={s.eyebrow}>{t("prayer").toUpperCase()}</Text>
          <Text style={s.prayer}>{prayer}</Text>
          {verse && (
            <View style={s.verse}>
              <Text selectable style={s.quote}>
                {verse.text}
              </Text>
              <Text style={s.reference}>
                {verse.reference} · {verse.editionName}
              </Text>
            </View>
          )}
          <Body small>{t("prayerReview")}</Body>
          <View style={s.actions}>
            <Button
              title={t("writeAbout")}
              onPress={() => router.push("/(tabs)/diary")}
            />
            <Button
              secondary
              title={t("another")}
              onPress={() => {
                setChoice(null);
                setName("");
                setPhase("choosing");
              }}
            />
          </View>
        </Card>
      )}

      {candles.length > 0 && (
        <View style={s.section}>
          <Text style={s.eyebrow}>{t("youLit").toUpperCase()}</Text>
          {candles.map((c) => {
            const intention = INTENTIONS.find((i) => i.id === c.intention);
            return (
              <View key={c.id} style={s.litRow}>
                <View style={s.dot} />
                <Text style={s.litText}>
                  {intention ? t(intention.title) : ""}
                  {c.name ? ` · ${c.name}` : ""}
                </Text>
              </View>
            );
          })}
          <Body small>{t("burning")}</Body>
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { gap: 6 },
  section: { gap: 12 },
  options: { gap: 10 },
  option: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: "center",
    gap: 3,
    boxShadow: "0 4px 12px rgba(48,44,40,0.06)",
  },
  optionOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  optionTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  optionSub: { fontSize: 13, color: colors.muted },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "600",
    color: colors.goldInk,
  },
  prayer: {
    fontFamily: serif,
    fontStyle: "italic",
    fontSize: 19,
    lineHeight: 29,
    color: colors.ink,
  },
  verse: {
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardLine,
    paddingTop: 12,
  },
  quote: { fontFamily: serif, fontSize: 17, lineHeight: 26, color: colors.ink },
  reference: { fontSize: 13, color: colors.muted },
  actions: { gap: 10, marginTop: 4 },
  litRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 32,
  },
  dot: { width: 8, height: 12, borderRadius: 6, backgroundColor: "#F2B451" },
  litText: { fontSize: 15, color: colors.ink },
});
