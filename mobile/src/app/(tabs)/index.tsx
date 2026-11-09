import AccountMenuContent from "../../components/AccountMenuContent";
import { BlurView, BlurTargetView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "expo-router/tabs";
import MemberAvatar from "../../components/MemberAvatar";
import { useReducedMotion } from "../../lib/use-reduced-motion";
import { useInterfaceCopy } from "../../lib/use-interface-copy";
import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type ComponentRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
  Modal,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Body, colors, serif } from "../../components/quiet-ui";
import ChurchScene, { type PlaceLabel } from "../../components/ChurchScene";
import ChurchEntrance from "../../components/ChurchEntrance";
import { useApp } from "../../lib/state";
import { useQuiet } from "../../lib/quiet-state";
import { q } from "../../lib/quiet-copy";
import { churchCopy, type ChurchWord } from "../../lib/church-copy";
import {
  adventWeekFor,
  isEvening,
  isProtestant,
  isOrthodox,
  welcomesCandles,
} from "../../lib/church-calendar";
import { loadCandles, useCandles } from "../../lib/candles";
import {
  markEntered,
  shouldShowEntrance,
  consumeChurchTour,
} from "../../lib/church-entrance";
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

export default function Home() {
  const { profile, saveProfile } = useApp();
  const tr = useInterfaceCopy();
  const insets = useSafeAreaInsets();
  const tabHeight = useBottomTabBarHeight();
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);
  const reduced = useReducedMotion();
  const [invitation, setInvitation] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [invitationOpacity] = useState(() => new Animated.Value(0));
  const candlesAllowed = welcomesCandles(profile);
  const { draft, clear } = useQuiet();
  const t = (key: ChurchWord) => churchCopy(profile.language, key);
  const params = useLocalSearchParams<{ advent?: string; present?: string }>();
  const preview =
    __DEV__ && params.advent
      ? Math.max(0, Math.min(4, Number(params.advent) || 0))
      : undefined;
  const plain = isProtestant(profile);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(clock);
  }, []);
  const night =
    profile.churchLighting === "night" ||
    (profile.churchLighting !== "day" && isEvening(now));
  const [entrance, setEntrance] = useState(shouldShowEntrance);
  const [aboutAdvent, setAboutAdvent] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [tour, setTour] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean | null>(null);
  const [focused, setFocused] = useState(true);
  const candles = useCandles();
  const live = useChurchPresence(focused && !entrance);
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
      let active = true;
      setFocused(true);
      void loadSoundOn().then((on) => {
        if (active) setSoundOn(on);
      });
      if (consumeChurchTour()) setTour(true);
      return () => {
        active = false;
        setFocused(false);
      };
    }, []),
  );
  // The labels are shown one by one each time someone walks in through the
  // doors, and again whenever "Show places" is pressed.
  const touring = tour && focused && !entrance;
  useEffect(() => {
    if (entrance || !focused || touring || dismissed) return;
    const timer = setTimeout(() => setInvitation(true), reduced ? 0 : 1600);
    return () => clearTimeout(timer);
  }, [entrance, focused, touring, dismissed, reduced]);
  useEffect(() => {
    const animation = Animated.timing(invitationOpacity, {
      toValue: invitation ? 1 : 0,
      duration: reduced ? 0 : 500,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [invitation, invitationOpacity, reduced]);
  const dismissInvitation = () => {
    setInvitation(false);
    setDismissed(true);
  };
  const journal = () => {
    dismissInvitation();
    router.push("/(tabs)/diary");
  };
  // Calm church sound on Home, after the doors, unless muted.
  useEffect(() => {
    if (!entrance && focused && soundOn) startAmbience();
    else stopAmbience();
  }, [entrance, focused, soundOn]);
  useEffect(() => () => stopAmbience(), []);
  const endTour = useCallback(() => {
    setTour(false);
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

  return (
    <View style={s.page}>
      <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill}>
        {!sceneFailed && (
          <ChurchScene
            fullScreen
            places={scenePlaces}
            night={night}
            adventWeek={week}
            litVotives={Math.min(15, BASE_VOTIVES + candles.length)}
            onPlace={open}
            accessibilityLabel={t("church")}
            paused={entrance || details || aboutAdvent}
            protestant={plain}
            orthodox={isOrthodox(profile)}
            candlesAllowed={candlesAllowed}
            tour={touring}
            onTourDone={endTour}
            onFailure={() => setSceneFailed(true)}
          />
        )}
      </BlurTargetView>
      {/* A soft fade behind the name and date so they stay readable over
          the lighter rooms; it has no edge of its own. */}
      <View
        pointerEvents="none"
        style={[s.headerFade, { height: insets.top + 170 }]}
      />
      <View
        pointerEvents="box-none"
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={s.brandRow}>
          <Ionicons name="leaf-outline" size={24} color="#E6CE99" />
          <Text style={s.brand}>GRACE &amp; GATHER</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Account and settings")}
            onPress={() => {
              dismissInvitation();
              setAccountOpen(true);
            }}
            style={s.profile}
          >
            <MemberAvatar />
          </Pressable>
        </View>
        <View style={s.dateRow}>
          <Text style={s.date}>
            {now.toLocaleDateString(profile.language, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          <Text style={s.date}>
            {now.toLocaleTimeString(profile.language, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        {!sceneFailed && <Text style={s.hint}>{t("tapAnywhere")}</Text>}
        <View style={s.tools}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: night }}
            accessibilityLabel={t("evening")}
            onPress={() =>
              void saveProfile({
                ...profile,
                churchLighting: night ? "day" : "night",
              }).catch(() => {})
            }
            style={s.tool}
          >
            <Ionicons
              name={night ? "moon" : "sunny-outline"}
              size={19}
              color="#FFF8E9"
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
              name={soundOn ? "volume-medium-outline" : "volume-mute-outline"}
              size={19}
              color="#FFF8E9"
            />
          </Pressable>
          {!sceneFailed && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("showPlaces")}
              onPress={() => {
                dismissInvitation();
                setTour(true);
              }}
              style={s.tool}
            >
              <Ionicons name="help-circle-outline" size={20} color="#FFF8E9" />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Your next step")}
            onPress={() => setDetails(true)}
            style={s.tool}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="#FFF8E9"
            />
          </Pressable>
        </View>
        {present !== null && present >= 1 && (
          <Animated.View
            pointerEvents="none"
            style={[s.presence, { opacity: presenceOpacity }]}
          >
            <Text style={s.presenceText}>
              {present === 1
                ? t("presentAlone")
                : t("present").replace("{n}", String(present))}
            </Text>
          </Animated.View>
        )}
      </View>
      {sceneFailed && (
        <ScrollView
          style={[
            s.fallback,
            { top: insets.top + 180, bottom: tabHeight + 200 },
          ]}
          contentContainerStyle={{ gap: 12 }}
        >
          {places.map((place) => (
            <Button
              key={place.key}
              title={place.label}
              onPress={() => open(place.key)}
            />
          ))}
        </ScrollView>
      )}
      <View
        pointerEvents="box-none"
        style={[s.promptArea, { bottom: tabHeight + 18 }]}
      >
        {invitation && !touring && !entrance && (
          <Animated.View style={[s.glass, { opacity: invitationOpacity }]}>
            <BlurView
              blurTarget={blurTarget}
              blurMethod="dimezisBlurViewSdk31Plus"
              intensity={55}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <ScrollView contentContainerStyle={s.promptContent}>
              <Text accessibilityRole="header" style={s.promptTitle}>
                {tr("What would you like to tell God today?")}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={journal}
                style={s.cta}
              >
                <Text style={s.ctaText}>{tr("Talk to God")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setInvitation(false);
                  router.push({
                    pathname: "/prayers",
                    params: { compose: "1" },
                  });
                }}
                style={s.stay}
              >
                <Text style={s.stayText}>{tr("Request a prayer")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={dismissInvitation}
                style={s.stay}
              >
                <Text style={s.stayText}>{tr("Stay here a little")}</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        )}
        {!invitation && !entrance && !touring && (
          <View style={s.reopen}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setInvitation(true)}
              style={s.stay}
            >
              <Text style={s.stayText}>{tr("Talk to God")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: "/prayers", params: { compose: "1" } })
              }
              style={s.stay}
            >
              <Text style={s.stayText}>{tr("Request a prayer")}</Text>
            </Pressable>
          </View>
        )}
      </View>
      <Modal
        visible={accountOpen}
        transparent
        animationType={reduced ? "none" : "fade"}
        onRequestClose={() => setAccountOpen(false)}
      >
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 68,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 20,
            alignItems: "flex-end",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Close")}
            onPress={() => setAccountOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#00000035",
            }}
          />
          <View
            style={{
              width: "100%",
              maxWidth: 360,
              maxHeight: "100%",
              backgroundColor: colors.paper,
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingLeft: 12,
                  paddingBottom: 10,
                  gap: 12,
                }}
              >
                <MemberAvatar />
                <Text
                  numberOfLines={2}
                  style={{
                    flex: 1,
                    color: colors.ink,
                    fontSize: 20,
                    fontFamily: serif,
                  }}
                >
                  {profile.name?.trim() || tr("Your space")}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr("Close")}
                  onPress={() => setAccountOpen(false)}
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={22} color={colors.ink} />
                </Pressable>
              </View>
              <AccountMenuContent onNavigate={() => setAccountOpen(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={details || aboutAdvent}
        transparent
        animationType={reduced ? "none" : "fade"}
        onRequestClose={() => {
          setDetails(false);
          setAboutAdvent(false);
        }}
      >
        <View
          style={[
            s.modal,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View style={s.detailCard}>
            <ScrollView contentContainerStyle={{ gap: 16, padding: 24 }}>
              <Button
                secondary
                title={tr("Close")}
                onPress={() => {
                  setDetails(false);
                  setAboutAdvent(false);
                }}
              />
              {aboutAdvent ? (
                <>
                  <Text style={s.detailTitle}>
                    {t("advent")} {week}
                    {theme}
                  </Text>
                  <Body>{t("adventAbout")}</Body>
                </>
              ) : (
                <>
                  <StepCheckIn />
                  <Button
                    title={tr("Talk to God")}
                    onPress={() => {
                      setDetails(false);
                      journal();
                    }}
                  />
                  {draft.entryId && (
                    <Button
                      secondary
                      title={q(profile.language, "newPage")}
                      onPress={() => {
                        setDetails(false);
                        clear();
                        journal();
                      }}
                    />
                  )}
                  {candlesAllowed && candles.length > 0 && (
                    <Button
                      secondary
                      title={`${t("youLit")} · ${candles.length}`}
                      onPress={() => {
                        setDetails(false);
                        router.push("/candle");
                      }}
                    />
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {entrance && (
        <ChurchEntrance
          language={profile.language}
          onEntered={() => {
            markEntered();
            setEntrance(false);
            setTour(true);
          }}
        />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#211B16" },
  headerFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundImage:
      "linear-gradient(180deg, rgba(25,19,14,0.6) 0%, rgba(25,19,14,0.36) 60%, rgba(25,19,14,0) 100%)",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    gap: 14,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brand: {
    fontSize: 12,
    letterSpacing: 2.2,
    color: "#FFF8E9",
    fontWeight: "700",
    flex: 1,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  profile: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  date: {
    fontSize: 11,
    letterSpacing: 1,
    color: "#FFF8E9",
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: "#FFF8E9",
    marginTop: -6,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  tools: { flexDirection: "row", justifyContent: "flex-end", gap: 6 },
  tool: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(35,29,23,0.48)",
    borderWidth: 1,
    borderColor: "#FFFFFF35",
    alignItems: "center",
    justifyContent: "center",
  },
  presence: {
    alignSelf: "center",
    backgroundColor: "#302C28B8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  presenceText: { fontSize: 12, color: "#FFF8E9", textAlign: "center" },
  promptArea: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
    maxHeight: "48%",
  },
  glass: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#FFF8E945",
    backgroundColor: "rgba(36,30,24,0.22)",
    overflow: "hidden",
  },
  promptContent: { padding: 24, gap: 18 },
  promptTitle: {
    fontFamily: serif,
    fontSize: 29,
    lineHeight: 36,
    color: "#FFFCF3",
    textAlign: "center",
  },
  cta: {
    minHeight: 50,
    padding: 14,
    backgroundColor: colors.paper,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: 16, fontWeight: "600", color: colors.ink },
  stay: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  stayText: {
    fontSize: 14,
    color: "#FFF8E9",
    textAlign: "center",
    textShadowColor: "#211B16",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  reopen: {
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "transparent",
  },
  fallback: { position: "absolute", left: 20, right: 20 },
  modal: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#0008",
  },
  detailCard: {
    maxHeight: "90%",
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: colors.paper,
    borderRadius: 24,
  },
  detailTitle: { fontFamily: serif, fontSize: 24, color: colors.ink },
});
