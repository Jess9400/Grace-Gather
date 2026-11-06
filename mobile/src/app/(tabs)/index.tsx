import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Button,
  Card,
  Body,
  colors,
  serif,
} from "../../components/quiet-ui";
import FloatingFeelings from "../../components/FloatingFeelings";
import ChurchScene, { type PlaceLabel } from "../../components/ChurchScene";
import ChurchEntrance from "../../components/ChurchEntrance";
import { useApp } from "../../lib/state";
import { useQuiet } from "../../lib/quiet-state";
import { q } from "../../lib/quiet-copy";
import { churchCopy, type ChurchWord } from "../../lib/church-copy";
import { adventWeekFor, isEvening } from "../../lib/church-calendar";
import { loadCandles, useCandles } from "../../lib/candles";
import { markEntered, shouldShowEntrance } from "../../lib/church-entrance";
import type { ChurchPlace } from "../../lib/church-scene";

const ROUTES: Record<Exclude<ChurchPlace, "wreath">, string> = {
  candles: "/candle",
  confession: "/(tabs)/confession",
  bible: "/(tabs)/bible",
  gather: "/(tabs)/gatherings",
  pews: "/(tabs)/diary",
};
const THEMES: ChurchWord[] = ["hope", "peaceWeek", "joy", "love"];
// Lit by others earlier in the day; the person's own candles are added to these.
const BASE_VOTIVES = 6;

export default function Home() {
  const { profile } = useApp();
  const { draft, update, clear } = useQuiet();
  const t = (key: ChurchWord) => churchCopy(profile.language, key);
  const params = useLocalSearchParams<{ advent?: string }>();
  const preview =
    __DEV__ && params.advent
      ? Math.max(0, Math.min(4, Number(params.advent) || 0))
      : undefined;
  const [now] = useState(() => new Date());
  const [night, setNight] = useState(() => isEvening(now));
  const [entrance, setEntrance] = useState(shouldShowEntrance);
  const [aboutAdvent, setAboutAdvent] = useState(false);
  const candles = useCandles();
  useEffect(() => {
    void loadCandles();
  }, []);
  const week = adventWeekFor(profile, now, preview);
  const theme =
    week > 0 && profile.tradition === "protestant"
      ? ` · ${t(THEMES[week - 1])}`
      : "";

  const places: (PlaceLabel & { sub: ChurchWord })[] = [
    {
      key: "candles",
      label: t("candles"),
      hint: t("candlesSub"),
      sub: "candlesSub",
    },
    {
      key: "confession",
      label: t("confession"),
      hint: t("confessionSub"),
      sub: "confessionSub",
    },
    { key: "bible", label: t("bible"), hint: t("bibleSub"), sub: "bibleSub" },
    {
      key: "gather",
      label: t("gather"),
      hint: t("gatherSub"),
      sub: "gatherSub",
      live: true,
    },
    { key: "pews", label: t("pews"), hint: t("pewsSub"), sub: "pewsSub" },
  ];
  const scenePlaces: PlaceLabel[] =
    week > 0
      ? [
          ...places,
          { key: "wreath", label: t("wreath"), hint: t("adventAbout") },
        ]
      : places;
  const open = (place: ChurchPlace) => {
    if (place === "wreath") setAboutAdvent((v) => !v);
    else router.push(ROUTES[place] as never);
  };

  return (
    <>
      <Screen>
        <View style={s.head}>
          <Text style={s.date}>
            {now.toLocaleDateString(profile.language, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          {week > 0 && (
            <Text style={s.advent}>
              {t("advent")} {week}
              {theme}
            </Text>
          )}
          <View style={s.titleRow}>
            <Text accessibilityRole="header" style={s.title}>
              {t("welcome")}
            </Text>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: night }}
              accessibilityLabel={t("evening")}
              onPress={() => setNight((v) => !v)}
              hitSlop={8}
              style={s.lightToggle}
            >
              <Ionicons
                name={night ? "moon" : "sunny-outline"}
                size={18}
                color={colors.ink}
              />
              <Text style={s.lightText}>
                {night ? t("evening") : t("daylight")}
              </Text>
            </Pressable>
          </View>
          <Text style={s.hint}>{t("tapPlace")}</Text>
        </View>

        <ChurchScene
          places={scenePlaces}
          night={night}
          adventWeek={week}
          litVotives={Math.min(15, BASE_VOTIVES + candles.length)}
          onPlace={open}
          accessibilityLabel={t("church")}
          paused={entrance}
        />

        {week > 0 && aboutAdvent && (
          <Card tint>
            <Text style={s.eyebrow}>{t("wreath").toUpperCase()}</Text>
            <Body>{t("adventAbout")}</Body>
          </Card>
        )}

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

        {candles.length > 0 && (
          <View style={s.group}>
            <Text style={s.eyebrow}>{t("today").toUpperCase()}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/candle")}
              style={s.row}
            >
              <View style={s.flame} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>
                  {t("youLit")} · {candles.length}
                </Text>
                <Text style={s.rowSub}>{t("burning")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          </View>
        )}

        <View style={s.group} accessibilityRole="list">
          <Text style={s.eyebrow}>{t("choose").toUpperCase()}</Text>
          <View style={s.list}>
            {places.map((p, i) => (
              <Pressable
                key={p.key}
                accessibilityRole="button"
                accessibilityLabel={`${p.label}. ${t(p.sub)}`}
                onPress={() => open(p.key)}
                style={({ pressed }) => [
                  s.row,
                  i < places.length - 1 && s.divider,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{p.label}</Text>
                  <Text style={s.rowSub}>{t(p.sub)}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.muted}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </Screen>
      {entrance && (
        <ChurchEntrance
          language={profile.language}
          onEntered={() => {
            markEntered();
            setEntrance(false);
          }}
        />
      )}
    </>
  );
}

const s = StyleSheet.create({
  head: { gap: 6 },
  date: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.muted,
  },
  advent: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "700",
    color: "#5B4780",
    textTransform: "uppercase",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontFamily: serif,
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
    flexShrink: 1,
  },
  lightToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  lightText: { fontSize: 13, color: colors.ink },
  hint: { fontSize: 14, lineHeight: 20, color: colors.muted },
  actions: { gap: 17, marginTop: 8 },
  whisper: {
    textAlign: "center",
    fontFamily: serif,
    fontStyle: "italic",
    fontSize: 15,
    color: colors.muted,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "600",
    color: colors.goldInk,
  },
  group: { gap: 8 },
  list: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 62,
    paddingVertical: 10,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardLine,
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  rowSub: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 2 },
  flame: { width: 10, height: 16, borderRadius: 8, backgroundColor: "#F2B451" },
});
