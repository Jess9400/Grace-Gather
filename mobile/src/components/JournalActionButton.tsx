import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./quiet-ui";

export default function JournalActionButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [s.button, pressed && s.pressed]}
    >
      <Text style={s.title}>{title}</Text>
      <Ionicons name="arrow-forward" size={20} color={colors.ink} />
    </Pressable>
  );
}
const s = StyleSheet.create({
  button: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#F4EEDF",
  },
  pressed: { backgroundColor: "#EDE4D1" },
  title: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    flex: 1,
    fontWeight: "500",
  },
});
