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
  Easing,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, Body, colors, serif } from "../../components/quiet-ui";
import type { PlaceLabel } from "../../components/ChurchScene";
import LivingChurchScene from "../../components/LivingChurchScene";
import ChurchEntrance from "../../components/ChurchEntrance";
import OrthodoxEntrance from "../../components/OrthodoxEntrance";
import { useApp } from "../../lib/state";
import { churchCopy, type ChurchWord } from "../../lib/church-copy";
import {
  adventWeekFor,
  isEvening,
  isProtestant,
  isOrthodox,
  welcomesCandles,
} from "../../lib/church-calendar";
import { loadCandles } from "../../lib/candles";
import {
  markEntered,
  shouldShowEntrance,
  consumeChurchTour,
} from "../../lib/church-entrance";
import { loadSoundOn, saveSoundOn, holdAmbience } from "../../lib/church-audio";
import {
  getChurchSnapshot,
  isRoomPlace,
  setWalker,
  roomCrop,
  type RoomPlace,
} from "../../lib/church-room";

import type { ChurchPlace } from "../../lib/church-scene";
import { artworkPlaceAt, type ChurchArt } from "../../lib/church-art";
import { pendingStep } from "../../lib/small-step";
import { firstChurchVisit } from "../../lib/church-tools";
import { StepCheckIn } from "../../components/SmallStep";
import { useChurchPresence } from "../../lib/church-presence";

const ROUTES: Record<Exclude<ChurchPlace, "wreath">, string> = {
  candles: "/candle",
  confession: "/(tabs)/confession",
  bible: "/(tabs)/bible",
  gather: "/(tabs)/gatherings",
  pews: "/(tabs)/diary",
  pray: "/pray",
};
const THEMES: ChurchWord[] = ["hope", "peaceWeek", "joy", "love"];
const presentCount = (count: number | null) => count !== null && count >= 1;

export default function Home() {
  const { profile, saveProfile, entries } = useApp();
  const weeklyDue = !!pendingStep(entries, new Date());
  const tr = useInterfaceCopy();
  const insets = useSafeAreaInsets();
  const tabHeight = useBottomTabBarHeight();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // Walking into a place: the church glides toward it while the words fade,
  // then its screen opens. Coming back to Home walks out again.
  const [walk] = useState(() => new Animated.Value(0));
  const [chrome] = useState(() => new Animated.Value(1));
  const [walkTo, setWalkTo] = useState<{
    x: number;
    y: number;
    zoom: number;
    dx: number;
    dy: number;
  } | null>(null);
  const walked = useRef(false);
  const arrive = useRef<null | (() => void)>(null);
  const blurTarget = useRef<ComponentRef<typeof View> | null>(null);
  const reduced = useReducedMotion();
  const [invitation, setInvitation] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [invitationOpacity] = useState(() => new Animated.Value(0));
  const candlesAllowed = welcomesCandles(profile);
  const t = (key: ChurchWord) => churchCopy(profile.language, key);
  const params = useLocalSearchParams<{ advent?: string; present?: string }>();
  const preview =
    __DEV__ && params.advent
      ? Math.max(0, Math.min(4, Number(params.advent) || 0))
      : undefined;
  const plain = isProtestant(profile);
  const churchArt: ChurchArt = isOrthodox(profile)
    ? "orthodox"
    : plain
      ? "protestant"
      : "catholic";
  // The Russian Orthodox church opens straight onto its named places, with one
  // «Поговорить с Богом» button instead of the invitation card. It is only for
  // Orthodox people using the app in Russian; Orthodox people in other
  // languages keep the earlier church, entrance and invitation.
  const eastern = isOrthodox(profile) && profile.language === "ru";
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
  const [toolsOpen, setToolsOpen] = useState(false);
  const [hasExplored, setHasExplored] = useState(false);
  const [tourPlace, setTourPlace] = useState<ChurchPlace | null>(null);
  const [soundOn, setSoundOn] = useState<boolean | null>(null);
  const [focused, setFocused] = useState(true);
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
    // A new person finds the church controls open on their first visit.
    void firstChurchVisit().then((first) => {
      if (first) setToolsOpen(true);
    });
  }, []);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setFocused(true);
      void loadSoundOn().then((on) => {
        if (active) setSoundOn(on);
      });
      if (consumeChurchTour()) {
        setInvitation(false);
        setDismissed(true);
        setTour(true);
      }
      if (walked.current) {
        walked.current = false;
        Animated.parallel([
          Animated.timing(walk, {
            toValue: 0,
            duration: 760,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(chrome, {
            toValue: 1,
            duration: 420,
            delay: 380,
            useNativeDriver: true,
          }),
        ]).start(() => setWalkTo(null));
      }
      return () => {
        active = false;
        setFocused(false);
      };
    }, [walk, chrome]),
  );
  // Start the walk once its target has been laid out.
  useEffect(() => {
    const go = arrive.current;
    if (!walkTo || !go) return;
    arrive.current = null;
    Animated.parallel([
      Animated.timing(chrome, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(walk, {
        toValue: 1,
        duration: 850,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => go());
  }, [walkTo, walk, chrome]);
  const enter = (
    place: RoomPlace,
    go: () => void,
    point?: { x: number; y: number },
  ) => {
    const at = point ?? getChurchSnapshot()?.points[place];
    if (reduced || sceneFailed || !at || arrive.current) return go();
    const stage = getChurchSnapshot() ?? {
      width: screenWidth,
      height: screenHeight,
    };
    const crop = roomCrop(place, insets.top, at, stage, screenWidth);
    walked.current = true;
    arrive.current = go;
    // Scaling about the place leaves it where it is; then slide the picture
    // to where the room's strip will show it.
    setWalkTo({
      x: at.x,
      y: at.y,
      zoom: crop.zoom,
      dx: crop.left - at.x * (1 - crop.zoom),
      dy: crop.top - at.y * (1 - crop.zoom),
    });
  };
  // The tab bar walks in from Home too (to the lectern, side door or window).
  const enterRef = useRef(enter);
  useEffect(() => {
    enterRef.current = enter;
  });
  useFocusEffect(
    useCallback(() => {
      if (entrance) return;
      return setWalker((place, go) => {
        enterRef.current(place, go);
        return true;
      });
    }, [entrance]),
  );
  // Exploration is optional and never runs underneath the welcome invitation.
  const touring = tour && focused && !entrance && !invitation;
  useEffect(() => {
    if (entrance || !focused || dismissed || tour || eastern) return;
    const timer = setTimeout(() => setInvitation(true), reduced ? 0 : 1000);
    return () => clearTimeout(timer);
  }, [entrance, focused, dismissed, tour, reduced, eastern]);
  useEffect(() => {
    const animation = Animated.timing(invitationOpacity, {
      toValue: invitation ? 1 : 0,
      duration: reduced ? 0 : 600,
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
    enter("pews", () => router.push("/(tabs)/diary"));
  };
  // Calm church sound on Home, after the doors, unless muted. The rooms keep
  // it playing softly; other screens let it fade out.
  useEffect(() => {
    if (entrance || !focused || !soundOn) return;
    return holdAmbience("full");
  }, [entrance, focused, soundOn]);
  const endTour = useCallback(() => {
    setTour(false);
    setHasExplored(true);
    setInvitation(true);
  }, []);

  const week = adventWeekFor(profile, now, preview);
  const theme = week > 0 && plain ? ` · ${t(THEMES[week - 1])}` : "";
  // The journal opens from "Talk to God". The Orthodox artwork also marks
  // the Bible stand and central doors in the guided tour.
  const places: (PlaceLabel & { sub: ChurchWord })[] = [
    ...(eastern
      ? [
          {
            key: "pray" as const,
            label: t("pray"),
            hint: t("praySub"),
            sub: "praySub" as const,
          },
        ]
      : []),
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
    {
      key: "bible",
      label: t("bible"),
      hint: t("bibleSub"),
      sub: "bibleSub",
    },
    ...(eastern
      ? []
      : ([
          {
            key: "gather",
            label: t("gather"),
            hint: t("gatherSub"),
            sub: "gatherSub",
            live: true,
          },
          { key: "pews", label: t("pews"), hint: t("pewsSub"), sub: "pewsSub" },
        ] as (PlaceLabel & { sub: ChurchWord })[])),
  ];
  const scenePlaces: PlaceLabel[] =
    week > 0
      ? [
          ...places,
          { key: "wreath", label: t("wreath"), hint: t("adventAbout") },
        ]
      : places;
  // An Orthodox church has its own entrance: a white church with a golden dome.
  const EntranceView = eastern ? OrthodoxEntrance : ChurchEntrance;
  const open = (place: ChurchPlace, point?: { x: number; y: number }) => {
    if (place === "wreath") return setAboutAdvent((v) => !v);
    const go = () => router.push(ROUTES[place] as never);
    if (isRoomPlace(place)) enter(place, go, point);
    else go();
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
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              walkTo && {
                transformOrigin: [walkTo.x, walkTo.y, 0],
                transform: [
                  {
                    translateX: walk.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, walkTo.dx],
                    }),
                  },
                  {
                    translateY: walk.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, walkTo.dy],
                    }),
                  },
                  {
                    scale: walk.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, walkTo.zoom],
                    }),
                  },
                ],
              },
            ]}
          >
            <LivingChurchScene
              art={churchArt}
              places={scenePlaces}
              night={night}
              onPlace={open}
              accessibilityLabel={t("church")}
              paused={entrance || aboutAdvent || !focused}
              tour={touring}
              labelsEnabled={!invitation}
              labelsAlways={eastern}
              onTourDone={endTour}
              onTourPlace={setTourPlace}
              onFailure={() => setSceneFailed(true)}
            />
          </Animated.View>
        )}
      </BlurTargetView>
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { opacity: chrome }]}
      >
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
            {toolsOpen && (
              <>
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
                    name={
                      soundOn ? "volume-medium-outline" : "volume-mute-outline"
                    }
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
                    <Ionicons
                      name="help-circle-outline"
                      size={20}
                      color="#FFF8E9"
                    />
                  </Pressable>
                )}
              </>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("churchControls")}
              accessibilityState={{ expanded: toolsOpen }}
              onPress={() => setToolsOpen(!toolsOpen)}
              style={s.tool}
            >
              <Ionicons
                name={toolsOpen ? "close" : "ellipsis-horizontal"}
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
        {invitation && !entrance && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("dismissWelcome")}
            onPress={(e) => {
              dismissInvitation();
              // A tap on a place in the church also walks into it, so the
              // welcome card never costs an extra tap.
              const { pageX, pageY } = e.nativeEvent;
              const tapped = sceneFailed
                ? null
                : artworkPlaceAt(
                    churchArt,
                    screenWidth,
                    screenHeight,
                    pageX,
                    pageY,
                    scenePlaces.map((place) => place.key),
                  );
              if (tapped) open(tapped);
            }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          pointerEvents="box-none"
          style={[s.promptArea, { bottom: tabHeight + 18 }]}
        >
          {invitation && !entrance && (
            <Animated.View style={[s.glass, { opacity: invitationOpacity }]}>
              <BlurView
                blurTarget={blurTarget}
                blurMethod="dimezisBlurViewSdk31Plus"
                intensity={55}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
              <ScrollView contentContainerStyle={s.promptContent}>
                {weeklyDue ? (
                  <StepCheckIn dark />
                ) : (
                  <>
                    <View accessibilityElementsHidden importantForAccessibility="no" style={s.grabHandle} />
                    <Text accessibilityRole="header" style={s.promptTitle}>
                      {tr("What would you like to tell God today?")}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={journal}
                      style={s.cta}
                    >
                      <View style={s.invitationAction}>
                        <View style={s.actionIcon}><MaterialCommunityIcons name="hands-pray" size={20} color="#613F1F" /></View>
                        <Text style={s.ctaText}>{tr("Talk to God")}</Text>
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setInvitation(false);
                        enter("altar", () =>
                          router.push({
                            pathname: "/prayers",
                            params: { compose: "1" },
                          }),
                        );
                      }}
                      style={s.prayerAction}
                    >
                      <View style={s.invitationAction}>
                        <View style={s.actionIcon}><Ionicons name="document-text-outline" size={18} color="#FFF1DC" /></View>
                        <Text style={s.invitationText}>{tr("Request a prayer")}</Text>
                      </View>
                    </Pressable>
                    {!hasExplored && !sceneFailed && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          dismissInvitation();
                          setTour(true);
                        }}
                        style={s.exploreLink}
                      >
                        <View style={s.invitationAction}>
                          <Text style={s.exploreText}>{t("exploreChurch")}</Text>
                          <Ionicons name="arrow-forward" size={16} color="#E6CE99" />
                        </View>
                      </Pressable>
                    )}
                  </>
                )}
              </ScrollView>
            </Animated.View>
          )}
          {touring && (
            <View style={s.tourCaption}>
              {tourPlace && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    endTour();
                    open(tourPlace);
                  }}
                >
                  <Text style={s.tourTitle}>
                    {scenePlaces.find((p) => p.key === tourPlace)?.label}
                  </Text>
                  <Text style={s.tourHint}>
                    {scenePlaces.find((p) => p.key === tourPlace)?.hint}
                  </Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={endTour}
                style={s.stay}
              >
                <Text style={s.stayText}>{t("finishExploring")}</Text>
              </Pressable>
            </View>
          )}
          {(dismissed || eastern) && !invitation && !entrance && !touring && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr("Talk to God")}
              onPress={eastern ? journal : () => setInvitation(true)}
              style={eastern ? s.talk : s.reopen}
            >
              <Text style={eastern ? s.talkText : s.stayText}>
                {tr("Talk to God")}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
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
        visible={aboutAdvent}
        transparent
        animationType={reduced ? "none" : "fade"}
        onRequestClose={() => setAboutAdvent(false)}
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
                onPress={() => setAboutAdvent(false)}
              />
              <Text style={s.detailTitle}>
                {t("advent")} {week}
                {theme}
              </Text>
              <Body>{t("adventAbout")}</Body>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {entrance && (
        <EntranceView
          language={profile.language}
          onEntered={() => {
            markEntered();
            setEntrance(false);
            setTour(false);
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
  tourCaption: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "rgba(48,44,40,0.94)",
    gap: 8,
  },
  tourTitle: {
    fontFamily: serif,
    fontSize: 24,
    color: "#FFFCF3",
    textAlign: "center",
  },
  tourHint: {
    fontSize: 15,
    lineHeight: 22,
    color: "#FFFCF3",
    textAlign: "center",
    marginTop: 8,
  },
  promptArea: {
    position: "absolute",
    left: 28,
    right: 28,
    alignItems: "center",
    maxHeight: "48%",
  },
  glass: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#E8BD8588",
    backgroundColor: "rgba(50,27,18,0.65)",
    overflow: "hidden",
  },
  promptContent: { paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
  grabHandle: { alignSelf: "center", width: 34, height: 4, borderRadius: 3, backgroundColor: "#DFC2A27A", marginBottom: 2 },
  promptTitle: {
    fontFamily: serif,
    fontSize: 26,
    lineHeight: 32,
    color: "#FFFCF3",
    textAlign: "center",
  },
  cta: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F8D6A1",
    borderRadius: 24,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  invitationAction: { maxWidth: "100%", alignSelf: "center", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actionIcon: { width: 24, alignItems: "center", justifyContent: "center" },
  ctaText: { flexShrink: 1, fontSize: 16, fontWeight: "600", color: "#543515" },
  invitationText: { flexShrink: 1, fontSize: 14, color: "#FFF8E9", textShadowColor: "#211B16", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  prayerAction: { minHeight: 42, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center" },
  stay: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  stayText: {
    fontSize: 14,
    color: "#FFF8E9",
    textAlign: "center",
    textShadowColor: "#211B16",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  exploreLink: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,248,233,0.18)",
  },
  exploreText: { flexShrink: 1, fontSize: 14, color: "#E6CE99" },
  reopen: {
    minHeight: 44,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(48,44,40,0.45)",
  },
  // The one main action in the Orthodox church.
  talk: {
    alignSelf: "stretch",
    minHeight: 56,
    paddingHorizontal: 22,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7E8",
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  talkText: { fontFamily: serif, fontSize: 20, color: colors.ink },
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
