import { useState, ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./quiet-ui";
export default function Disclosure({
  title,
  children,
  initiallyOpen = false,
}: {
  title: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={s.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={s.trigger}
      >
        <Text style={s.title}>{title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={17}
          color={colors.muted}
        />
      </Pressable>
      {open && <View style={s.content}>{children}</View>}
    </View>
  );
}
const s = StyleSheet.create({
  section: { borderTopWidth: 1, borderColor: colors.line },
  trigger: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  title: { color: colors.ink, fontSize: 16, lineHeight: 25, flex: 1 },
  content: { gap: 18, paddingBottom: 24 },
});
