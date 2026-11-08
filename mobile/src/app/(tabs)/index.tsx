import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { setStatusBarStyle } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "expo-router/tabs";
import { Screen, colors, serif } from "../../components/quiet-ui";
import MemberAvatar from "../../components/MemberAvatar";
import ChurchScene, { type PlaceLabel } from "../../components/ChurchScene";
import ChurchEntrance from "../../components/ChurchEntrance";
import { useApp } from "../../lib/state";
import { useQuiet } from "../../lib/quiet-state";
import { q } from "../../lib/quiet-copy";
import * as storage from "../../lib/storage";
import { useClock } from "../../lib/use-clock";
import { useInterfaceCopy } from "../../lib/use-interface-copy";
import { churchCopy, type ChurchWord } from "../../lib/church-copy";
import {
  adventWeekFor,
  isEvening,
  isProtestant,
  welcomesCandles,
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
import { useChurchPresence } from "../../lib/church-presence";

const ROUTES: Record<Exclude<ChurchPlace, "wreath">, string> = {
  candles: "/candle",
  confession: "/(tabs)/confession",
  bible: "/(tabs)/bible",
  gather: "/(tabs)/gatherings",
  pews: "/(tabs)/diary",
};
const THEMES: ChurchWord[] = ["hope", "peaceWeek", "joy", "love"];
// Decorative candles do not represent activity by other members.
const BASE_VOTIVES = 0;
const presentCount = (count: number | null) => count !== null && count >= 1;
const IVORY = "#FFF8EC";
// Once someone chooses to "stay here a little", the card stays tucked away
// for the rest of the visit.
let stayCollapsed = false;

export default function Home() {
  const { profile } = useApp();
  const candlesAllowed = welcomesCandles(profile);
  const { draft, clear } = useQuiet();
  const tr = useInterfaceCopy();
  const insets = useSafeAreaInsets();
  const tabBar = useBottomTabBarHeight();
  const t = (key: ChurchWord) => churchCopy(profile.language, key);
  const params = useLocalSearchParams<{ advent?: string; present?: string }>();
  const preview =
    __DEV__ && params.advent
      ? Math.max(0, Math.min(4, Number(params.advent) || 0))
      : undefined;
  const plain = isProtestant(profile);
  const clock = useClock();
  const [now] = useState(() => new Date());
  const [night, setNight] = useState(() => isEvening(now));
  const [entrance, setEntrance] = useState(shouldShowEntrance);
  const [aboutAdvent, setAboutAdvent] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [tour, setTour] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean | null>(null);
  const [focused, setFocused] = useState(true);
  const [collapsed, setCollapsed] = useState(stayCollapsed);
  const candles = useCandles();
  const live = useChurchPresence(focused && !entrance);
  // The count shows for five seconds after walking in, then fades.
  const [presenceOpacity] = useState(() => new Animated.Value(0));
  const hasPresence = presentCount(live);
  useEffect(() => {
    if (!focused || entrance || !hasPresence) {
      presenceOpacity.setValue(0);
      return;
    }
    presenceOpacity.setValue(1);
    const fade = Animated.sequence([
      Animated.delay(5000),
      Animated.timing(presenceOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);
    fade.start();
    return () => fade.stop();
  }, [focused, entrance, hasPresence, presenceOpacity]);
  // Development preview of the count (e.g. /?present=30); never in release.
  const present =
    __DEV__ && params.present ? Number(params.present) || null : live;
  useEffect(() => {
    void loadCandles();
    void loadSoundOn().then(setSoundOn);
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      // Light text over the church; the rest of the app keeps dark text.
      setStatusBarStyle("light");
      return () => {
        setFocused(false);
        setStatusBarStyle("dark");
      };
    }, []),
  );
  // Calm church sound on Home, after the doors, unless muted.
  useEffect(() => {
    if (!entrance && focused && soundOn) startAmbience();
    else stopAmbience();
  }, [entrance, focused, soundOn]);
  useEffect(() => () => stopAmbience(), []);
  // The tour runs once; "Show places" replays it.
  const touring = tour && focused && !entrance;
  const endTour = useCallback(() => {
    setTour(false);
    void storage.setItem("church-tour-seen", "yes").catch(() => {});
  }, []);

  const week = adventWeekFor(profile, now, preview);
  const theme = week > 0 && plain ? ` · ${t(THEMES[week - 1])}` : "";
  const places: (PlaceLabel & { sub: ChurchWord })[] = [
    ...(!candlesAllowed
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
    const next = !(soundOn ?? false);
    setSoundOn(next);
    void saveSoundOn(next);
  };
  const talk = () => router.push("/(tabs)/diary");
  const stay = () => {
    stayCollapsed = true;
    setCollapsed(true);
  };
  const newPage = () => {
    clear();
    router.push("/(tabs)/diary");
  };
  const showLit = candlesAllowed && candles.length > 0;
  const date = new Date(clock);
  const entranceView = entrance && (
    <ChurchEntrance
      language={profile.language}
      onEntered={() => {
        markEntered();
        setEntrance(false);
        void storage
          .getItem("church-tour-seen")
          .then((seen) => {
            if (!seen) setTour(true);
          })
          .catch(() => {});
      }}
    />
  );

  // Without 3D, a calm list keeps every place reachable.
  if (sceneFailed)
    return (
      <>
        <Screen>
          <Text accessibilityRole="header" style={s.fallbackTitle}>
            {t("welcome")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={talk}
            style={[s.fallbackCard]}
          >
            <Text style={s.fallbackTell}>{t("tellGod")}</Text>
          </Pressable>
          {draft.entryId && (
            <Pressable
              accessibilityRole="button"
              onPress={newPage}
              style={[s.list, s.row]}
            >
              <Ionicons name="add" size={18} color={colors.ink} />
              <Text style={[s.rowTitle, { flex: 1 }]}>
                {q(profile.language, "newPage")}
              </Text>
            </Pressable>
          )}
          {showLit && (
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
        </Screen>
        {entranceView}
      </>
    );

  return (
    <View style={s.root}>
      <ChurchScene
        fullscreen
        places={scenePlaces}
        night={night}
        adventWeek={week}
        litVotives={Math.min(15, BASE_VOTIVES + candles.length)}
        onPlace={open}
        accessibilityLabel={t("church")}
        paused={entrance}
        protestant={plain}
        candlesAllowed={candlesAllowed}
        tour={touring}
        onTourDone={endTour}
        onFailure={() => setSceneFailed(true)}
      />

      <View
        pointerEvents="none"
        style={[s.scrim, { height: insets.top + 190 }]}
      />

      <View
        pointerEvents="box-none"
        style={[s.top, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.brandRow} pointerEvents="box-none">
          <Text style={s.brand}>GRACE & GATHER</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Account and settings")}
            onPress={() => router.push("/account")}
            style={s.avatar}
          >
            <MemberAvatar color="#E0BE76" />
          </Pressable>
        </View>
        <View style={s.dateRow} pointerEvents="none">
          <Text style={s.dateText}>
            {date
              .toLocaleDateString(profile.language, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
              .toUpperCase()}
          </Text>
          <Text style={s.dateText}>
            {date.toLocaleTimeString(profile.language, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        </View>
        {week > 0 && (
          <Text style={s.advent} pointerEvents="none">
            {t("advent")} {week}
            {theme}
          </Text>
        )}
        <View style={s.infoRow} pointerEvents="box-none">
          <View style={{ flex: 1, gap: 6 }} pointerEvents="none">
            {present !== null && present >= 1 && (
              <Animated.View
                style={[s.present, { opacity: presenceOpacity }]}
                accessibilityLiveRegion="polite"
              >
                <View style={s.presentDot} />
                <Text style={s.presentText}>
                  {present === 1
                    ? t("presentAlone")
                    : t("present").replace("{n}", String(present))}
                </Text>
              </Animated.View>
            )}
            <Text style={s.hint}>{t("tapAnywhere")}</Text>
          </View>
          {/* Quiet controls that sit in the church like part of it. */}
          <View style={s.tools}>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: !!soundOn }}
              accessibilityLabel={soundOn ? t("soundOn") : t("soundOff")}
              onPress={toggleSound}
              hitSlop={4}
              style={s.tool}
            >
              <Ionicons
                name={soundOn ? "volume-medium-outline" : "volume-mute-outline"}
                size={18}
                color={IVORY}
              />
            </Pressable>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: night }}
              accessibilityLabel={t("evening")}
              onPress={() => setNight((v) => !v)}
              hitSlop={4}
              style={s.tool}
            >
              <Ionicons
                name={night ? "moon-outline" : "sunny-outline"}
                size={18}
                color={IVORY}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("showPlaces")}
              onPress={() => setTour(true)}
              hitSlop={4}
              style={s.tool}
            >
              <Ionicons name="help-outline" size={18} color={IVORY} />
            </Pressable>
          </View>
        </View>
      </View>

      <View
        pointerEvents="box-none"
        style={[s.bottom, { bottom: tabBar + 12 }]}
      >
        {week > 0 && aboutAdvent && (
          <View style={s.note}>
            <Text style={s.noteTitle}>{t("wreath").toUpperCase()}</Text>
            <Text style={s.noteText}>{t("adventAbout")}</Text>
          </View>
        )}
        {(showLit || draft.entryId) && (
          <View style={s.chips}>
            {showLit && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/candle")}
                style={({ pressed }) => [s.chip, pressed && { opacity: 0.85 }]}
              >
                <View style={s.flame} />
                <Text style={s.chipText}>
                  {t("youLit")} · {candles.length}
                </Text>
              </Pressable>
            )}
            {draft.entryId && (
              <Pressable
                accessibilityRole="button"
                onPress={newPage}
                style={({ pressed }) => [s.chip, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="add" size={16} color={IVORY} />
                <Text style={s.chipText}>{q(profile.language, "newPage")}</Text>
              </Pressable>
            )}
          </View>
        )}
        <StepCheckIn glass />
        {/* While the tour points out each place, the card steps aside. */}
        {collapsed || touring ? (
          <Pressable
            accessibilityRole="button"
            onPress={talk}
            style={({ pressed }) => [s.pill, pressed && { opacity: 0.85 }]}
          >
            <BlurView
              tint="dark"
              intensity={30}
              style={StyleSheet.absoluteFill}
            />
            <Text style={s.pillText}>{t("onYourHeart")}</Text>
          </Pressable>
        ) : (
          <View style={s.card}>
            <BlurView
              tint="dark"
              intensity={35}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.cardTint} pointerEvents="none" />
            <Text accessibilityRole="header" style={s.cardTitle}>
              {t("tellGod")}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={talk}
              style={({ pressed }) => [s.talk, pressed && { opacity: 0.9 }]}
            >
              <Text style={s.talkText}>{t("talkToGod")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={stay}
              hitSlop={6}
              style={s.stay}
            >
              <Text style={s.stayText}>{t("stayHere")}</Text>
            </Pressable>
          </View>
        )}
      </View>
      {entranceView}
    </View>
  );
}

const glassBorder = "rgba(255,236,214,0.22)";
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#2A211B" },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundImage:
      "linear-gradient(180deg, rgba(30,22,16,0.62) 0%, rgba(30,22,16,0.32) 55%, rgba(30,22,16,0) 100%)",
  },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    gap: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: IVORY,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 6,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(36,26,20,0.78)",
  },
  dateRow: { flexDirection: "row", justifyContent: "space-between" },
  dateText: {
    color: IVORY,
    fontSize: 11,
    letterSpacing: 1.4,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowRadius: 6,
  },
  advent: {
    color: "#E2D4F2",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowRadius: 6,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  present: { flexDirection: "row", alignItems: "center", gap: 7 },
  presentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#8FE0A8",
  },
  presentText: {
    color: IVORY,
    fontSize: 13,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowRadius: 6,
  },
  hint: {
    color: "rgba(255,248,236,0.86)",
    fontSize: 12,
    lineHeight: 17,
    maxWidth: 230,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowRadius: 6,
  },
  tools: { flexDirection: "row", gap: 8 },
  tool: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,22,16,0.32)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glassBorder,
  },
  bottom: { position: "absolute", left: 16, right: 16, gap: 10 },
  card: {
    borderRadius: 28,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 14,
    alignItems: "center",
    gap: 18,
    borderWidth: 1,
    borderColor: glassBorder,
    ...(Platform.OS === "android" && {
      backgroundColor: "rgba(70,40,28,0.86)",
    }),
  },
  cardTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(92,48,30,0.5)",
  },
  cardTitle: {
    fontFamily: serif,
    fontSize: 27,
    lineHeight: 34,
    color: IVORY,
    textAlign: "center",
  },
  talk: {
    alignSelf: "stretch",
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: "#FFF6E8",
    alignItems: "center",
    justifyContent: "center",
  },
  talkText: { color: colors.ink, fontSize: 16, fontWeight: "600" },
  stay: { minHeight: 36, justifyContent: "center", paddingHorizontal: 12 },
  stayText: { color: "#F2E6D6", fontSize: 14 },
  pill: {
    alignSelf: "center",
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "center",
    backgroundColor: "rgba(40,26,20,0.55)",
    borderWidth: 1,
    borderColor: glassBorder,
  },
  pillText: { color: IVORY, fontSize: 16 },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(40,26,20,0.6)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glassBorder,
  },
  chipText: { color: IVORY, fontSize: 14, fontWeight: "600" },
  flame: {
    width: 8,
    height: 14,
    borderRadius: 5,
    backgroundColor: "#FFC35A",
  },
  note: {
    borderRadius: 20,
    padding: 14,
    gap: 4,
    backgroundColor: "rgba(52,38,70,0.8)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glassBorder,
  },
  noteTitle: {
    color: "#E2D4F2",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  noteText: { color: IVORY, fontSize: 14, lineHeight: 20 },
  fallbackTitle: {
    fontFamily: serif,
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
  },
  fallbackCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.ink,
  },
  fallbackTell: { fontFamily: serif, fontSize: 22, color: colors.white },
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
});
