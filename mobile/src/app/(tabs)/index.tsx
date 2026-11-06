import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Button,
  Card,
  Body,
  colors,
  serif,
} from "../../components/quiet-ui";
import ChurchScene, { type PlaceLabel } from "../../components/ChurchScene";
import ChurchEntrance from "../../components/ChurchEntrance";
import { useApp } from "../../lib/state";
import { useQuiet } from "../../lib/quiet-state";
import { q } from "../../lib/quiet-copy";
import * as storage from "../../lib/storage";
import { churchCopy, type ChurchWord } from "../../lib/church-copy";
import {
  adventWeekFor,
  isEvening,
  isProtestant,
} from "../../lib/church-calendar";
import { loadCandles, useCandles } from "../../lib/candles";
import { markEntered, shouldShowEntrance } from "../../lib/church-entrance";
import {
  loadSoundOn,
  saveSoundOn,
  startAmbience,
  stopAmbience,
} from "../../lib/church-audio";
import type { ChurchPlace } from "../../lib/church-scene";
import { StepCheckIn } from "../../components/SmallStep";

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
const TOUR_KEY = "church-tour-seen";

export default function Home() {
  const { profile } = useApp();
  const { draft, clear } = useQuiet();
  const t = (key: ChurchWord) => churchCopy(profile.language, key);
  const params = useLocalSearchParams<{ advent?: string }>();
  const preview =
    __DEV__ && params.advent
      ? Math.max(0, Math.min(4, Number(params.advent) || 0))
      : undefined;
  const plain = isProtestant(profile);
  const [now] = useState(() => new Date());
  const [night, setNight] = useState(() => isEvening(now));
  const [entrance, setEntrance] = useState(shouldShowEntrance);
  const [aboutAdvent, setAboutAdvent] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [tour, setTour] = useState(false);
  const [tourSeen, setTourSeen] = useState<boolean | null>(null);
  const [soundOn, setSoundOn] = useState<boolean | null>(null);
  const [focused, setFocused] = useState(true);
  const candles = useCandles();
  useEffect(() => {
    void loadCandles();
    void loadSoundOn().then(setSoundOn);
    void storage
      .getItem(TOUR_KEY)
      .then((v) => setTourSeen(v === "yes"))
      .catch(() => setTourSeen(false));
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  // The labels are shown once, the first time someone walks in, and again
  // whenever "Show places" is pressed.
  const touring = tour || (!entrance && tourSeen === false);
  // Calm church sound on Home, after the doors, unless muted.
  useEffect(() => {
    if (!entrance && focused && soundOn) startAmbience();
    else stopAmbience();
  }, [entrance, focused, soundOn]);
  useEffect(() => () => stopAmbience(), []);
  const endTour = useCallback(() => {
    setTour(false);
    setTourSeen(true);
    void storage.setItem(TOUR_KEY, "yes").catch(() => {});
  }, []);

  const week = adventWeekFor(profile, now, preview);
  const theme = week > 0 && plain ? ` · ${t(THEMES[week - 1])}` : "";
  const places: (PlaceLabel & { sub: ChurchWord })[] = [
    ...(plain
      ? []
      : [
          {
            key: "candles" as const,
            label: t("candles"),
            hint: t("candlesSub"),
            sub: "candlesSub" as const,
          },
        ]),
    plain
      ? {
          key: "confession",
          label: t("unburden"),
          hint: t("unburdenSub"),
          sub: "unburdenSub",
        }
      : {
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
  const toggleSound = () => {
    const next = !(soundOn ?? true);
    setSoundOn(next);
    void saveSoundOn(next);
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
            <View style={s.tools}>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: night }}
                accessibilityLabel={t("evening")}
                onPress={() => setNight((v) => !v)}
                style={s.tool}
              >
                <Ionicons
                  name={night ? "moon" : "sunny-outline"}
                  size={19}
                  color={colors.ink}
                />
              </Pressable>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: !!soundOn }}
                accessibilityLabel={soundOn ? t("soundOn") : t("soundOff")}
                onPress={toggleSound}
                style={s.tool}
              >
                <Ionicons
                  name={
                    soundOn ? "volume-medium-outline" : "volume-mute-outline"
                  }
                  size={19}
                  color={colors.ink}
                />
              </Pressable>
              {!sceneFailed && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("showPlaces")}
                  onPress={() => setTour(true)}
                  style={s.tool}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={20}
                    color={colors.ink}
                  />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {!sceneFailed && (
          <ChurchScene
            places={scenePlaces}
            night={night}
            adventWeek={week}
            litVotives={Math.min(15, BASE_VOTIVES + candles.length)}
            onPlace={open}
            accessibilityLabel={t("church")}
            paused={entrance}
            protestant={plain}
            tour={touring}
            onTourDone={endTour}
            onFailure={() => setSceneFailed(true)}
          />
        )}

        <StepCheckIn />

        {week > 0 && aboutAdvent && (
          <Card tint>
            <Text style={s.eyebrow}>{t("wreath").toUpperCase()}</Text>
            <Body>{t("adventAbout")}</Body>
          </Card>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/diary")}
          style={({ pressed }) => [s.tell, pressed && { opacity: 0.9 }]}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.tellTitle}>{t("tellGod")}</Text>
            <Text style={s.tellSub}>{t("tellGodSub")}</Text>
          </View>
          <View style={s.tellArrow}>
            <Ionicons name="create-outline" size={22} color={colors.white} />
          </View>
        </Pressable>
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

        {!plain && candles.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/candle")}
            style={[s.list, s.row]}
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
        )}

        {sceneFailed && (
          <View style={s.list} accessibilityRole="list">
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
        )}
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
  tools: { flexDirection: "row", gap: 6 },
  tool: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  tell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.ink,
    boxShadow: "0 10px 26px rgba(48,44,40,0.22)",
  },
  tellTitle: {
    fontFamily: serif,
    fontSize: 22,
    lineHeight: 29,
    color: colors.white,
  },
  tellSub: { fontSize: 14, lineHeight: 20, color: "#DCD3C4" },
  tellArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "600",
    color: colors.goldInk,
  },
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
