import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./quiet-ui";

// The journal's suggested step. `primary` is the page's one main action;
// suggestions inside the conversation use the quieter outlined form.
export default function JournalActionButton({
  title,
  onPress,
  primary = false,
}: {
  title: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const ink = primary ? colors.white : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        primary ? s.primary : s.outline,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[s.title, { color: ink }]}>{title}</Text>
      <Ionicons name="arrow-forward" size={19} color={ink} />
    </Pressable>
  );
}
const s = StyleSheet.create({
  button: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 26,
  },
  primary: { backgroundColor: colors.ink },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#B28A3E59",
  },
  title: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "600",
  },
});
