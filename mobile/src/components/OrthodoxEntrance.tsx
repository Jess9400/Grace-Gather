import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { churchCopy } from "../lib/church-copy";
import type { Language } from "../lib/content";
import { serif } from "./quiet-ui";
import EntranceLayer from "./EntranceLayer";

// The entrance for an Orthodox church: a white church with a golden onion
// dome at dusk. Tapping it swings the two doors open onto warm light and the
// icon screen, then fades into the church. Drawn as images, not 3D.
const ART = { width: 390, height: 844 };
// Where the doorway sits in the artwork.
const DOOR = { left: 150, top: 547, width: 45, height: 189 };
const SKY = "#1E2238";
const OPEN_MS = 1500;
const FADE_MS = 700;

const background = require("../../assets/church/orthodox-entrance/background.png");
const leftLeaf = require("../../assets/church/orthodox-entrance/door-left.png");
const rightLeaf = require("../../assets/church/orthodox-entrance/door-right.png");

export default function OrthodoxEntrance({
  language,
  onEntered,
}: {
  language: Language;
  onEntered: () => void;
}) {
  const t = (key: Parameters<typeof churchCopy>[1]) =>
    churchCopy(language, key);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [reduced, setReduced] = useState(false);
  const [open] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(0));
  const [words] = useState(() => new Animated.Value(0));
  const started = useRef(false);
  const entered = useRef(onEntered);
  useEffect(() => {
    entered.current = onEntered;
  }, [onEntered]);

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
    const done = () => entered.current();
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
    <EntranceLayer color={SKY} onBack={enter}>
      <View style={styles.root}>
        <View
          style={StyleSheet.absoluteFill}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Image
            source={background}
            style={{
              position: "absolute",
              left: artLeft,
              top: artTop,
              width: artWidth,
              height: artHeight,
            }}
          />
          <Animated.Image source={leftLeaf} style={leaf("left")} />
          <Animated.Image source={rightLeaf} style={leaf("right")} />
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
      </View>
    </EntranceLayer>
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
