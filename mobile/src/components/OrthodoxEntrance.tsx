import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { churchCopy } from "../lib/church-copy";
import IntroHandoff from "./IntroHandoff";
import { releaseIntroHandoff } from "../lib/intro-handoff";
import type { Language } from "../lib/content";
import { serif } from "./quiet-ui";

// A drawn church entrance, not 3D: tapping it swings the two doors open onto
// warm light, then fades into the church.
// - Orthodox: a white church with a golden onion dome and an icon above the door.
// - Protestant: a simple modern church with glass doors, because grand stone
//   doors feel foreign, even pretentious, to many Protestants.
const ART = { width: 390, height: 844 };
const SKY = "#1E2238";
const OPEN_MS = 1500;
const FADE_MS = 700;
const CHURCHES = {
  orthodox: {
    // Where the doorway sits in the artwork.
    door: { left: 150, top: 547, width: 45, height: 189 },
    background: require("../../assets/church/orthodox-entrance/background.png"),
    left: require("../../assets/church/orthodox-entrance/door-left.png"),
    right: require("../../assets/church/orthodox-entrance/door-right.png"),
  },
  protestant: {
    door: { left: 150, top: 596, width: 45, height: 140 },
    background: require("../../assets/church/protestant-entrance/background.png"),
    left: require("../../assets/church/protestant-entrance/door-left.png"),
    right: require("../../assets/church/protestant-entrance/door-right.png"),
  },
};

export default function OrthodoxEntrance({
  language,
  onEntered,
  church = "orthodox",
}: {
  language: Language;
  onEntered: () => void;
  church?: keyof typeof CHURCHES;
}) {
  const { door: DOOR, background, left: leftLeaf, right: rightLeaf } = CHURCHES[church];
  const t = (key: Parameters<typeof churchCopy>[1]) =>
    churchCopy(language, key);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [reduced, setReduced] = useState(false);
  const [open] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(0));
  const [words] = useState(() => new Animated.Value(0));
  const [loadedParts, setLoadedParts] = useState(0);
  const started = useRef(false);
  const entered = useRef(onEntered);
  useEffect(() => {
    entered.current = onEntered;
  }, [onEntered]);

  useEffect(() => {
    if (loadedParts === 7) releaseIntroHandoff();
  }, [loadedParts]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => mounted && setReduced(value))
      .catch(() => {});
    const preference = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    Animated.timing(words, {
      toValue: 1,
      duration: 900,
      delay: 250,
      useNativeDriver: true,
    }).start();
    return () => {
      mounted = false;
      preference.remove();
    };
  }, [words]);

  const enter = useCallback(() => {
    if (started.current) return;
    started.current = true;
    // The animation's completion callback is not guaranteed on a phone, so a
    // timer also finishes the entrance; whichever comes first wins.
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      entered.current();
    };
    setTimeout(done, OPEN_MS + FADE_MS + 1000);
    if (reduced) {
      Animated.timing(fade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(done);
      return;
    }
    Animated.parallel([
      Animated.timing(open, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: FADE_MS,
        delay: OPEN_MS - 200,
        useNativeDriver: true,
      }),
    ]).start(done);
  }, [reduced, open, fade]);

  // Leaving the app mid-entrance simply finishes it.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && started.current) entered.current();
    });
    return () => sub.remove();
  }, []);

  // Cover the screen, keeping the church's foot at the bottom.
  const scale = Math.max(width / ART.width, height / ART.height);
  const artWidth = ART.width * scale,
    artHeight = ART.height * scale;
  const artLeft = (width - artWidth) / 2,
    artTop = height - artHeight;
  const leaf = (side: "left" | "right") => {
    const x = side === "left" ? DOOR.left : DOOR.left + DOOR.width;
    return {
      position: "absolute" as const,
      left: artLeft + x * scale,
      top: artTop + DOOR.top * scale,
      width: DOOR.width * scale,
      height: DOOR.height * scale,
      transformOrigin: side,
      transform: [
        { perspective: 800 },
        {
          rotateY: open.interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", side === "left" ? "-96deg" : "96deg"],
          }),
        },
      ],
    };
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={enter}
    >
      <View style={styles.root} accessibilityViewIsModal>
        <View
          style={StyleSheet.absoluteFill}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Image
            source={background}
            onLoadEnd={() => setLoadedParts((loaded) => loaded | 1)}
            style={{
              position: "absolute",
              left: artLeft,
              top: artTop,
              width: artWidth,
              height: artHeight,
            }}
          />
          <Animated.Image
            source={leftLeaf}
            style={leaf("left")}
            onLoadEnd={() => setLoadedParts((loaded) => loaded | 2)}
          />
          <Animated.Image
            source={rightLeaf}
            style={leaf("right")}
            onLoadEnd={() => setLoadedParts((loaded) => loaded | 4)}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("enter")}
          accessibilityHint={t("tapDoors")}
          onPress={enter}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View
            style={[
              styles.top,
              {
                paddingTop: insets.top + 54,
                opacity: words,
                transform: [
                  {
                    translateY: words.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.peace} accessibilityRole="header">
              {t("peace")}
            </Text>
            <Text style={styles.rest}>{t("rest")}</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.bottom,
              {
                paddingBottom: Math.max(insets.bottom, 18) + 26,
                opacity: words,
              },
            ]}
          >
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{t("tapDoors")}</Text>
            </View>
          </Animated.View>
        </Pressable>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.light, { opacity: fade }]}
        />
        {Platform.OS !== "web" && <IntroHandoff />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SKY },
  top: { alignItems: "center", gap: 12, paddingHorizontal: 28 },
  peace: {
    fontFamily: serif,
    fontSize: 36,
    lineHeight: 42,
    color: "#F7EFE2",
    textAlign: "center",
  },
  rest: { fontSize: 16, lineHeight: 22, color: "#E6DCC8", textAlign: "center" },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  cta: {
    minHeight: 50,
    paddingHorizontal: 26,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(224,190,118,0.7)",
    backgroundColor: "rgba(30,24,20,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontSize: 16, fontWeight: "600", color: "#F7EFE2" },
  // The warm light of the church the doors open onto.
  light: { backgroundColor: "#FFF4DE" },
});
