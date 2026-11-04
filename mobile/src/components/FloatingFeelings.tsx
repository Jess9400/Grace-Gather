import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { feelings } from "../generated/quiet-feelings";
import { copy, Language } from "../lib/content";
import { q } from "../lib/quiet-copy";
import { colors, serif } from "./quiet-ui";
const placements = [
  { top: "8%", left: "5%" },
  { top: "10%", right: "5%" },
  { top: "29%", left: 0 },
  { top: "30%", right: 0 },
  { bottom: "13%", left: 0 },
  { bottom: "11%", right: 0 },
  { bottom: 0, left: "36%" },
] as const;
function Feeling({
  id,
  index,
  selected,
  onPress,
  reduced,
  language,
}: {
  id: string;
  index: number;
  selected: boolean;
  onPress: () => void;
  reduced: boolean;
  language: Language;
}) {
  const [motion] = useState(() => new Animated.Value(0));
  useEffect(() => {
    motion.setValue(0);
    if (reduced || selected) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 120),
        Animated.timing(motion, {
          toValue: 1,
          duration: 3000 + index * 170,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: 3000 + index * 170,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [motion, index, reduced, selected]);
  const title =
    id === "great"
      ? q(language, "great")
      : id === "sad"
        ? q(language, "low")
        : copy(language, id);
  return (
    <Animated.View
      style={[
        s.float,
        placements[index],
        {
          transform: [
            {
              translateY: motion.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -10],
              }),
            },
            { rotate: index % 2 ? "6deg" : "-6deg" },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={title}
        onPress={onPress}
        style={[s.pill, selected && s.selected]}
      >
        <Text style={[s.mark, selected && s.light]}>{feelings[id].mark}</Text>
        <Text style={[s.label, selected && s.light]}>
          {title}
          {selected ? " ✓" : ""}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
export default function FloatingFeelings({
  chosen,
  onChange,
  language,
}: {
  chosen: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
  language: Language;
}) {
  const [reduced, setReduced] = useState(true);
  const { fontScale } = useWindowDimensions();
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduced(v);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  const ids = Object.keys(feelings);
  if (fontScale > 1.35)
    return (
      <View style={{ gap: 24 }}>
        <Text accessibilityRole="header" style={s.question}>
          {q(language, "question")}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {ids.map((id) => (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!chosen[id] }}
              accessibilityLabel={feelings[id].label}
              key={id}
              onPress={() => {
                const next = { ...chosen };
                if (next[id]) delete next[id];
                else next[id] = 2;
                onChange(next);
              }}
              style={[s.pill, !!chosen[id] && s.selected]}
            >
              <Text style={[s.label, !!chosen[id] && s.light]}>
                {id === "great"
                  ? q(language, "great")
                  : id === "sad"
                    ? q(language, "low")
                    : copy(language, id)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  return (
    <View style={s.orbit}>
      <Text accessibilityRole="header" style={s.question}>
        {q(language, "question")}
      </Text>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={s.star}
      >
        ✧
      </Text>
      {ids.map((id, index) => (
        <Feeling
          key={id}
          id={id}
          index={index}
          selected={!!chosen[id]}
          reduced={reduced}
          language={language}
          onPress={() => {
            const next = { ...chosen };
            if (next[id]) delete next[id];
            else next[id] = 2;
            onChange(next);
          }}
        />
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  orbit: {
    height: 430,
    width: "100%",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  question: {
    fontFamily: serif,
    fontSize: 38,
    lineHeight: 45,
    letterSpacing: -1,
    color: colors.ink,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  float: { position: "absolute" },
  pill: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFFDA",
    borderWidth: 1,
    borderColor: "#B28A3E40",
    borderRadius: 60,
    paddingVertical: 11,
    paddingHorizontal: 13,
    boxShadow: "0px 5px 22px rgba(48,44,40,.045)",
  },
  selected: { backgroundColor: colors.ink, borderColor: colors.ink },
  mark: { fontSize: 13, color: colors.gold },
  label: { fontFamily: serif, fontSize: 16, color: colors.ink },
  light: { color: colors.white },
  star: {
    position: "absolute",
    top: "48%",
    right: "6%",
    color: colors.gold,
    fontSize: 16,
  },
});
