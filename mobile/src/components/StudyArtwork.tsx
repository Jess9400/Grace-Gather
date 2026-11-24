import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./quiet-ui";
import { useReducedMotion } from "../lib/use-reduced-motion";

// Layered native shapes give the books depth without another GL scene or asset download.
// Only a featured illustration moves; library thumbnails remain still.
export default function StudyArtwork({
  variant = 0,
  animated = false,
  hero = false,
}: {
  variant?: number;
  animated?: boolean;
  hero?: boolean;
}) {
  const reduced = useReducedMotion();
  const [lift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced || !animated) return;
    const motion = Animated.loop(
      Animated.sequence([
        Animated.timing(lift, {
          toValue: 1,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(lift, {
          toValue: 0,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    motion.start();
    return () => {
      motion.stop();
      lift.setValue(0);
    };
  }, [animated, reduced, lift]);
  const glyph = (
    [
      "leaf-outline",
      "sunny-outline",
      "sparkles-outline",
      "heart-outline",
    ] as const
  )[variant % 4];
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[s.stage, hero && s.hero]}
      pointerEvents="none"
    >
      <View style={s.halo} />
      <View style={s.haloInner} />
      <View style={s.shadow} />
      <Animated.View
        style={{
          transform: [
            {
              translateY: lift.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -7],
              }),
            },
            { perspective: 650 },
            { rotateX: "12deg" },
            { rotateY: "-16deg" },
            { rotateZ: "-9deg" },
          ],
        }}
      >
        <View style={s.lowerBook} />
        <View style={s.pages} />
        <View style={[s.book, variant % 2 === 1 && s.bookWarm]}>
          <View style={s.spine} />
          <View style={s.coverRule} />
          <Ionicons name={glyph} size={hero ? 38 : 29} color={colors.goldInk} />
          <View style={s.ribbon} />
        </View>
      </Animated.View>
      <View style={s.sparkle}>
        <Ionicons name="sparkles" size={18} color={colors.goldInk} />
      </View>
      <View style={s.leaf}>
        <Ionicons name="leaf-outline" size={25} color={colors.goldInk} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  stage: {
    height: 132,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.pale,
  },
  hero: { height: 188 },
  halo: {
    position: "absolute",
    width: 176,
    height: 176,
    borderRadius: 100,
    backgroundColor: "#C9A45C0D",
    borderWidth: 1,
    borderColor: "#C9A45C24",
  },
  haloInner: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "#C9A45C18",
  },
  shadow: {
    position: "absolute",
    bottom: 13,
    width: 110,
    height: 13,
    borderRadius: 60,
    backgroundColor: "#120E0B66",
    transform: [{ scaleY: 0.6 }],
  },
  lowerBook: {
    position: "absolute",
    top: 14,
    left: -7,
    width: 88,
    height: 96,
    borderRadius: 6,
    backgroundColor: "#705332",
    transform: [{ rotateZ: "13deg" }],
  },
  pages: {
    position: "absolute",
    top: 7,
    left: 5,
    width: 88,
    height: 98,
    borderRadius: 5,
    borderRightWidth: 5,
    borderBottomWidth: 6,
    borderColor: "#CAB899",
    backgroundColor: "#F1E4CB",
  },
  book: {
    width: 90,
    height: 100,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#B69355",
    backgroundColor: "#392920",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 7 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bookWarm: { backgroundColor: "#57402B" },
  spine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 9,
    borderRightWidth: 1,
    borderColor: "#C9A45C55",
    backgroundColor: "#241B15",
  },
  coverRule: {
    position: "absolute",
    top: 10,
    bottom: 10,
    left: 17,
    right: 9,
    borderWidth: 1,
    borderColor: "#C9A45C66",
    borderRadius: 2,
  },
  ribbon: {
    position: "absolute",
    top: -1,
    right: 16,
    width: 7,
    height: 24,
    backgroundColor: colors.gold,
  },
  sparkle: { position: "absolute", right: "20%", top: 16, opacity: 0.8 },
  leaf: {
    position: "absolute",
    left: "20%",
    bottom: 12,
    transform: [{ rotateZ: "-28deg" }],
    opacity: 0.7,
  },
});
