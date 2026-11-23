import { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, serif } from "./quiet-ui";
import BrandMark from "./BrandMark";
import IntroDoor from "./IntroDoor";
import {
  CHURCH_SIZE,
  HILLS_GROWN,
  INTRO_MOMENTS,
  LIGHT_SHOWN,
  LIGHT_SIZE,
  MOON_RISE,
  STARS_SHOWN,
  WALK_MS,
  churchOnRoad,
  introCopy,
  introMotes,
  introStars,
  lanternLit,
  lanternSpots,
  placeOnRoad,
  treeSpots,
  wordsWait,
  type IntroWalkProps,
  type Placed,
} from "../lib/intro-walk";

// The first-visit intro on a phone: a road at night leads to a lit church.
// Each press of the button walks closer; the last one arrives at the door.
// It is the same walk as the web drawing (IntroWalk.web.tsx). The pictures in
// assets/intro are renders of that drawing, because the app has no vector
// drawing of its own. The night scene is artwork with its own colours; the
// words and the buttons use the Candlelight palette.

const NIGHT = "#05060C";
const MOMENTS = Array.from({ length: INTRO_MOMENTS }, (_, i) => i);
const CHURCHES = {
  catholic: require("../../assets/intro/church-catholic.png"),
  orthodox: require("../../assets/intro/church-orthodox.png"),
  protestant: require("../../assets/intro/church-protestant.png"),
};
const TREE = require("../../assets/intro/tree.png");
const LANTERN = require("../../assets/intro/lantern.png");
const GLOW = require("../../assets/intro/glow.png");
const LIGHT = require("../../assets/intro/light.png");
const MOON = require("../../assets/intro/moon.png");
const HILLS = require("../../assets/intro/hills.png");
const ROAD = require("../../assets/intro/road.png");
const DOOR_LIGHT = require("../../assets/intro/doorlight.png");

// Where one thing on the road stands at each of the five moments.
function alongTheWalk(side: number, along: number) {
  return MOMENTS.map((moment) => placeOnRoad(moment, side, along));
}

export default function IntroWalk({
  language,
  church,
  onDone,
  stillMoment,
}: IntroWalkProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // People who ask their phone for less motion see each moment at once.
  // Nothing is drawn until the phone has answered, so the walk never starts
  // one way and switches to the other.
  const [calm, setCalm] = useState<boolean | null>(stillMoment === undefined ? null : true);
  const [moment, setMoment] = useState(stillMoment ?? 0);
  const [instant, setInstant] = useState(stillMoment ?? -1);
  const [walk] = useState(() => new Animated.Value(stillMoment ?? 0));
  const [dip] = useState(() => new Animated.Value(0));
  const [veil] = useState(() => new Animated.Value(stillMoment === undefined ? 1 : 0));
  const [doorLight] = useState(() => new Animated.Value(stillMoment === INTRO_MOMENTS - 1 ? 1 : 0));
  const [pulse] = useState(() => new Animated.Value(1));
  const stars = useMemo(() => introStars(), []);
  const motes = useMemo(() => introMotes(), []);
  const spots = useMemo(
    () => ({
      church: MOMENTS.map(churchOnRoad),
      trees: treeSpots.map((spot) => alongTheWalk(spot.side, spot.along)),
      lanterns: lanternSpots.map((spot) => alongTheWalk(spot.side, spot.along)),
    }),
    [],
  );

  useEffect(() => {
    if (stillMoment !== undefined) return;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => active && setCalm(reduced))
      .catch(() => active && setCalm(false));
    return () => {
      active = false;
    };
  }, [stillMoment]);
  const animate = calm === false;
  // The night fades in, and the light ahead breathes.
  useEffect(() => {
    if (calm === null) return;
    if (calm) {
      veil.setValue(0);
      return;
    }
    Animated.timing(veil, {
      toValue: 0,
      duration: 2400,
      delay: 80,
      useNativeDriver: true,
    }).start();
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.7,
          duration: 2250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    breathe.start();
    return () => breathe.stop();
  }, [calm, veil, pulse]);

  const last = moment === INTRO_MOMENTS - 1;
  const copy = introCopy[language] ?? introCopy.en;
  const [title, body, action] = copy.moments[moment];

  // The stage is a phone-shaped column. The words and the button keep a
  // fixed space at the bottom; the scene above them is scaled to fit.
  const W = Math.min(width, 480);
  const H = height;
  const horizon = Math.max(220, H - 364 - insets.bottom);
  const scale = Math.min(W / 390, horizon / 470);

  // Every moving thing follows the one walk, from moment to moment.
  const at = (values: number[]) =>
    walk.interpolate({ inputRange: MOMENTS, outputRange: values });
  // Each thing hangs from a small anchor whose centre is its place on the
  // road, and grows about that centre. (An anchor with no size at all may not
  // be drawn on Android.)
  const placed = (along: Placed[]) => ({
    position: "absolute" as const,
    left: 0,
    top: 0,
    width: 2,
    height: 2,
    opacity: at(along.map((spot) => (spot.passed ? 0 : 1))),
    transform: [
      { translateX: at(along.map((spot) => spot.x)) },
      { translateY: at(along.map((spot) => spot.y)) },
      { scale: at(along.map((spot) => spot.size)) },
    ],
  });

  const step = () => {
    if (last) return onDone(animate ? moment : undefined);
    const next = moment + 1;
    setMoment(next);
    if (!animate) {
      walk.setValue(next);
      if (next === INTRO_MOMENTS - 1) doorLight.setValue(1);
      return;
    }
    Animated.timing(walk, {
      toValue: next,
      duration: WALK_MS,
      easing: Easing.bezier(0.45, 0.05, 0.25, 1),
      useNativeDriver: true,
    }).start();
    // A small dip with each footstep while walking.
    dip.setValue(0);
    Animated.sequence(
      [5, 0, 5, 0].map((toValue) =>
        Animated.timing(dip, {
          toValue,
          duration: WALK_MS / 5,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ),
    ).start();
    // At the door, light from inside falls across the ground.
    if (next === INTRO_MOMENTS - 1)
      Animated.timing(doorLight, {
        toValue: 1,
        duration: 1600,
        delay: WALK_MS - 900,
        useNativeDriver: true,
      }).start();
  };

  if (calm === null) return <View style={[StyleSheet.absoluteFill, s.night]} />;
  return (
    // A tap anywhere shows the rest of the words straight away.
    <Pressable
      accessible={false}
      onPress={() => setInstant(moment)}
      style={[StyleSheet.absoluteFill, s.night]}
    >
      <View style={{ width: W, height: H, overflow: "hidden" }}>
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[StyleSheet.absoluteFill, { transform: [{ translateY: dip }] }]}
        >
          <View style={[s.sky, { height: horizon + 2 }]} />
          <Animated.View
            style={[
              s.across,
              { height: horizon, opacity: at(STARS_SHOWN) },
            ]}
          >
            {[0, 1, 2, 3].map((layer) => (
              <Twinkle key={layer} animate={animate} seconds={2.8 + layer}>
                {stars.map((star, i) =>
                  i % 4 === layer ? (
                    <View
                      key={i}
                      style={{
                        position: "absolute",
                        left: star.across * W,
                        top: star.down * horizon,
                        width: star.size,
                        height: star.size,
                        borderRadius: star.size / 2,
                        backgroundColor: "#FFF5DE",
                        opacity: star.opacity,
                      }}
                    />
                  ) : null,
                )}
              </Twinkle>
            ))}
          </Animated.View>
          <Animated.Image
            source={MOON}
            style={{
              position: "absolute",
              // The picture is the moon with its glow around it.
              left: W * 0.6 - 68 * scale,
              top: horizon * 0.25 - 68 * scale,
              width: 170 * scale,
              height: 170 * scale,
              opacity: at(MOMENTS.map((m) => (m === INTRO_MOMENTS - 1 ? 0 : 1))),
              transform: [{ translateY: at(MOON_RISE) }],
            }}
          />
          <Animated.Image
            source={HILLS}
            resizeMode="stretch"
            style={{
              position: "absolute",
              left: 0,
              top: horizon - 48 * scale,
              width: W,
              height: 60 * scale,
              transformOrigin: [W / 2, 48 * scale, 0],
              transform: [{ scale: at(HILLS_GROWN) }],
            }}
          />
          <View style={[s.ground, { top: horizon }]} />
          {/* Everything below is drawn from the point on the horizon the road leads to. */}
          <View
            collapsable={false}
            style={{
              position: "absolute",
              left: W / 2 - 1,
              top: horizon - 1,
              width: 2,
              height: 2,
              transform: [{ scale }],
            }}
          >
            {/* The light seen from far away, growing as the church comes near. */}
            <Animated.View
              style={{
                position: "absolute",
                left: -209,
                top: -209,
                width: 420,
                height: 420,
                opacity: at(LIGHT_SHOWN),
                transform: [
                  { translateY: at(CHURCH_SIZE.map((size) => -55 * size)) },
                  { scale: at(LIGHT_SIZE) },
                ],
              }}
            >
              <Animated.Image
                source={LIGHT}
                style={{ width: 420, height: 420, opacity: pulse }}
              />
            </Animated.View>
            <Image source={ROAD} style={s.road} />
            <Animated.Image
              source={DOOR_LIGHT}
              style={[s.doorLight, { opacity: doorLight }]}
            />
            <Animated.View collapsable={false} style={placed(spots.church)}>
              <Image source={CHURCHES[church]} style={s.church} />
              <IntroDoor anchorOffset={1} />
            </Animated.View>
            {spots.trees.map((along, i) => (
              <Animated.View key={i} collapsable={false} style={placed(along)}>
                <Image source={TREE} style={s.tree} />
              </Animated.View>
            ))}
            {spots.lanterns.map((along, i) => {
              // A lantern comes alight as the walker draws near it.
              const lit = along.map((spot, m) => (lanternLit(m, spot) ? 1 : 0));
              return (
                <Animated.View
                  key={i}
                  collapsable={false}
                  style={placed(along)}
                >
                  <Animated.Image
                    source={GLOW}
                    style={[s.lanternGlow, { opacity: at(lit) }]}
                  />
                  <Image source={LANTERN} style={s.lantern} />
                  <Animated.View
                    style={[
                      s.flame,
                      { opacity: at(lit.map((on) => (on ? 1 : 0.1))) },
                    ]}
                  />
                </Animated.View>
              );
            })}
          </View>
          {animate &&
            moment > 0 &&
            motes.map((mote, i) => (
              <Mote
                key={i}
                left={mote.across * W}
                top={horizon + mote.down * scale}
                seconds={mote.seconds}
                delay={mote.delay}
              />
            ))}
        </Animated.View>
        {/* Shade behind the name at the top and the words at the bottom. */}
        <Animated.View
          pointerEvents="none"
          style={[
            s.topShade,
            { opacity: at(MOMENTS.map((m) => (m === INTRO_MOMENTS - 1 ? 1 : 0.6))) },
          ]}
        />
        <View pointerEvents="none" style={[s.bottomShade, { top: horizon + 30 }]} />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, s.veil, { opacity: veil }]}
        />
        <View style={[s.head, { top: insets.top + 20 }]}>
          <View style={s.name}>
            <BrandMark size={32} />
            <Text style={s.brand} maxFontSizeMultiplier={1.3}>
              GRACE &amp; GATHER
            </Text>
          </View>
          {!last && (
            <Pressable
              accessibilityRole="button"
              onPress={() => onDone()}
              style={({ pressed }) => [s.skip, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.skipText} maxFontSizeMultiplier={1.3}>
                {copy.skip}
              </Text>
            </Pressable>
          )}
        </View>
        <View style={[s.words, { bottom: 112 + insets.bottom }]}>
          <Words
            key={moment}
            title={title}
            body={body}
            animate={animate}
            wait={wordsWait(moment)}
            now={instant === moment}
          />
        </View>
        <View style={[s.action, { bottom: 40 + insets.bottom }]}>
          <Pressable
            accessibilityRole="button"
            onPress={step}
            style={({ pressed }) => [s.button, pressed && { opacity: 0.85 }]}
          >
            <Text style={s.buttonText} maxFontSizeMultiplier={1.3}>
              {action}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// One moment's words. The large line arrives word by word, each a long,
// gentle fade and a small rise, overlapping into one soft wave; the quieter
// sentence follows. They wait until the walk has almost arrived.
function Words({
  title,
  body,
  animate,
  wait,
  now,
}: {
  title: string;
  body: string;
  animate: boolean;
  wait: number;
  now: boolean;
}) {
  const words = title.split(" ");
  const [shown] = useState(() =>
    [...words, body].map(() => new Animated.Value(animate ? 0 : 1)),
  );
  useEffect(() => {
    if (!animate) return;
    const arrive = Animated.parallel(
      shown.map((value, i) =>
        Animated.timing(value, {
          toValue: 1,
          duration: now ? 250 : i < words.length ? 1100 : 1200,
          delay: now ? 0 : wait + i * 180 + (i < words.length ? 0 : 350),
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ),
    );
    arrive.start();
    return () => arrive.stop();
  }, [animate, now, shown, wait, words.length]);
  const rise = (value: Animated.Value, from: number) => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [from, 0],
        }),
      },
    ],
  });
  return (
    <>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={title}
        style={s.title}
      >
        {words.map((word, i) => (
          <Animated.Text
            key={i}
            maxFontSizeMultiplier={1.3}
            style={[s.word, rise(shown[i], 8)]}
          >
            {word}
          </Animated.Text>
        ))}
      </View>
      <Animated.Text
        maxFontSizeMultiplier={1.3}
        style={[s.body, rise(shown[words.length], 5)]}
      >
        {body}
      </Animated.Text>
    </>
  );
}

// A layer of stars that slowly brightens and dims.
function Twinkle({
  animate,
  seconds,
  children,
}: {
  animate: boolean;
  seconds: number;
  children: React.ReactNode;
}) {
  const [light] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!animate) return;
    const twinkle = Animated.loop(
      Animated.sequence(
        [0.35, 1].map((toValue) =>
          Animated.timing(light, {
            toValue,
            duration: (seconds * 1000) / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ),
      ),
    );
    twinkle.start();
    return () => twinkle.stop();
  }, [animate, light, seconds]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: light }]}>
      {children}
    </Animated.View>
  );
}

// A small warm light drifting up from the road.
function Mote({
  left,
  top,
  seconds,
  delay,
}: {
  left: number;
  top: number;
  seconds: number;
  delay: number;
}) {
  const [drift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const rising = Animated.loop(
      Animated.sequence([
        Animated.delay(delay * 1000),
        Animated.timing(drift, {
          toValue: 1,
          duration: seconds * 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    rising.start();
    return () => rising.stop();
  }, [delay, drift, seconds]);
  return (
    <Animated.View
      style={[
        s.mote,
        {
          left,
          top,
          opacity: drift.interpolate({
            inputRange: [0, 0.15, 1],
            outputRange: [0, 0.9, 0],
          }),
          transform: [
            {
              translateX: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 14],
              }),
            },
            {
              translateY: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -110],
              }),
            },
          ],
        },
      ]}
    />
  );
}

const s = StyleSheet.create({
  night: { backgroundColor: NIGHT, alignItems: "center", overflow: "hidden" },
  across: { position: "absolute", left: 0, top: 0, width: "100%" },
  sky: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    backgroundImage:
      "linear-gradient(180deg, #05060C 0%, #0B0C17 40%, #1A1521 70%, #33231B 100%)",
  },
  ground: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "100%",
    backgroundImage:
      "linear-gradient(180deg, #15110E 0%, #0C0907 45%, #070504 100%)",
  },
  // Each picture stands on the point it is placed at: the road's far end for
  // the road and the light on the ground, the middle of its base for the rest.
  // That point is the centre of a 2-point anchor, hence the 1 in each offset.
  road: { position: "absolute", left: 1 - 420, top: 1, width: 840, height: 700 },
  doorLight: {
    position: "absolute",
    left: 1 - 300,
    top: 1,
    width: 600,
    height: 440,
  },
  church: {
    position: "absolute",
    left: 1 - 150,
    top: 1 - 400,
    width: 300,
    height: 400,
  },
  tree: {
    position: "absolute",
    left: 1 - 35,
    top: 1 - 150,
    width: 70,
    height: 150,
  },
  lantern: {
    position: "absolute",
    left: 1 - 12,
    top: 1 - 72,
    width: 24,
    height: 72,
  },
  lanternGlow: {
    position: "absolute",
    left: 1 - 36,
    top: 1 - 94,
    width: 72,
    height: 72,
  },
  flame: {
    position: "absolute",
    left: 1 - 3.5,
    top: 1 - 63,
    width: 7,
    height: 9,
    borderRadius: 2,
    backgroundColor: "#FFE2A6",
  },
  mote: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#FFD591",
    boxShadow: "0px 0px 6px 2px rgba(255,200,110,0.55)",
  },
  topShade: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: 150,
    backgroundImage:
      "linear-gradient(180deg, rgba(3,3,6,0.92) 0%, rgba(3,3,6,0.6) 55%, rgba(3,3,6,0) 100%)",
  },
  bottomShade: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "100%",
    backgroundImage:
      "linear-gradient(180deg, rgba(8,6,5,0) 0%, rgba(8,6,5,0.5) 40%, rgba(8,6,5,0.82) 100%)",
  },
  veil: { backgroundColor: "#000" },
  head: {
    position: "absolute",
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  name: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  brand: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
    color: colors.ink,
  },
  skip: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(10,8,8,0.55)",
    justifyContent: "center",
  },
  skipText: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  words: {
    position: "absolute",
    left: 26,
    right: 26,
    // Anchored above the button: longer words at large text sizes grow
    // upward instead of covering it.
    minHeight: 190,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  title: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  word: {
    marginHorizontal: 4,
    fontFamily: serif,
    fontSize: 29,
    lineHeight: 36,
    letterSpacing: -0.3,
    color: colors.ink,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 12,
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: "center",
    color: colors.ink,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  action: { position: "absolute", left: 28, right: 28 },
  button: {
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: 26,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: colors.paper, fontSize: 16, fontWeight: "600" },
});
