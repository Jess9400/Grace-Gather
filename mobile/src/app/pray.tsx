import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Body,
  Button,
  Card,
  Chip,
  Field,
  Heading,
  Notice,
  Row,
  Screen,
  Subheading,
  colors,
  serif,
} from "../components/quiet-ui";
import { useApp } from "../lib/state";
import { isOrthodox, welcomesCandles } from "../lib/church-calendar";
import {
  namesPrayer,
  prayCopy,
  prayerList,
  type PrayerText,
  type PrayWord,
} from "../lib/pray-copy";

// Pray: the prayers people know by heart, a prayer for loved ones by name, or
// their own words in the journal. Opened from the icon in the Orthodox church.
export default function Pray() {
  const { profile } = useApp(),
    lang = profile.language,
    t = (key: PrayWord) => prayCopy(lang, key);
  const [reading, setReading] = useState<PrayerText | null>(null);
  const [kind, setKind] = useState<"health" | "repose">("health");
  const [names, setNames] = useState("");
  const [error, setError] = useState("");

  // Opened only from the Russian Orthodox church; anyone else goes Home.
  if (!isOrthodox(profile) || lang !== "ru") return <Redirect href="/" />;

  if (reading)
    return (
      <Screen>
        <Card>
          <Text accessibilityRole="header" style={s.readingTitle}>
            {reading.title.toUpperCase()}
          </Text>
          <Text selectable style={s.prayer}>
            {reading.text}
          </Text>
          <Text style={s.amen}>{t("amen")}.</Text>
        </Card>
        <Button title={t("amen")} onPress={() => setReading(null)} />
        {welcomesCandles(profile) && (
          <Button
            secondary
            title={t("lightCandle")}
            onPress={() => router.push("/candle")}
          />
        )}
      </Screen>
    );

  return (
    <Screen back keyboard>
      <Heading>{t("title")}</Heading>
      <Body>{t("intro")}</Body>

      <Card>
        <Subheading>{t("prayers")}</Subheading>
        {prayerList(lang).map((p, i) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`${p.title}. ${p.note}`}
            onPress={() => setReading({ title: p.title, text: p.text })}
            style={({ pressed }) => [
              s.row,
              i > 0 && s.rowLine,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.rowTitle}>{p.title}</Text>
              <Text style={s.rowNote}>{p.note}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.cardMuted}
              accessible={false}
            />
          </Pressable>
        ))}
      </Card>

      <Card>
        <Subheading>{t("forOthers")}</Subheading>
        <Row>
          <Chip
            title={t("health")}
            selected={kind === "health"}
            onPress={() => setKind("health")}
          />
          <Chip
            title={t("repose")}
            selected={kind === "repose"}
            onPress={() => setKind("repose")}
          />
        </Row>
        <Body small>
          {t(kind === "health" ? "namesHealth" : "namesRepose")}
        </Body>
        <Field
          label={t("namesField")}
          placeholder={t("namesPlaceholder")}
          value={names}
          maxLength={200}
          onChangeText={(value) => {
            setNames(value);
            setError("");
          }}
        />
        <Notice text={error} />
        <Button
          title={t("prayForThem")}
          onPress={() => {
            const who = names.trim().replace(/[\s,;.]+$/, "");
            if (!who) return setError(t("needNames"));
            setReading(namesPrayer(lang, kind, who));
          }}
        />
        <Body small>{t("namesPrivate")}</Body>
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("ownWords")}. ${t("ownWordsSub")}`}
        onPress={() => router.push("/(tabs)/diary")}
        style={({ pressed }) => [s.own, { opacity: pressed ? 0.8 : 1 }]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.rowTitle}>{t("ownWords")}</Text>
          <Text style={s.rowNote}>{t("ownWordsSub")}</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.goldInk}
          accessible={false}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("askPrayer")}. ${t("askPrayerSub")}`}
        onPress={() =>
          router.push({ pathname: "/prayers", params: { compose: "1" } })
        }
        style={({ pressed }) => [s.own, { opacity: pressed ? 0.8 : 1 }]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.rowTitle}>{t("askPrayer")}</Text>
          <Text style={s.rowNote}>{t("askPrayerSub")}</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.goldInk}
          accessible={false}
        />
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 60,
    paddingVertical: 8,
  },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.cardLine },
  rowTitle: { fontFamily: serif, fontSize: 18, color: colors.cardInk },
  rowNote: { fontSize: 13, lineHeight: 18, color: colors.cardMuted },
  own: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.white,
  },
  readingTitle: {
    textAlign: "center",
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: "700",
    color: colors.goldInk,
  },
  prayer: {
    textAlign: "center",
    fontFamily: serif,
    fontSize: 20,
    lineHeight: 32,
    color: colors.cardInk,
  },
  amen: {
    textAlign: "center",
    fontFamily: serif,
    fontSize: 20,
    color: colors.goldInk,
  },
});
