import type { ComponentProps } from "react";
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, serif } from "./quiet-ui";
type Icon = ComponentProps<typeof Ionicons>["name"];
export function StudyAction({
  title,
  onPress,
  disabled = false,
  loading = false,
  secondary = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  icon?: Icon;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        secondary ? s.secondary : s.primary,
        (disabled || loading) && s.disabled,
        pressed && s.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.goldInk : colors.paper} />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={secondary ? colors.goldInk : colors.paper}
        />
      ) : null}
      <Text
        style={[
          s.actionText,
          { color: secondary ? colors.goldInk : colors.paper },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function StudyHeader({
  title,
  closeLabel,
  onClose,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <View style={s.header}>
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={onClose}
        style={s.close}
      >
        <Ionicons name="close" size={22} color={colors.ink} />
      </Pressable>
    </View>
  );
}
export function StudyLink({
  title,
  onPress,
  icon = "book-outline",
}: {
  title: string;
  onPress: () => void;
  icon?: Icon;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.link, pressed && s.pressed]}
    >
      <Ionicons name={icon} size={21} color={colors.goldInk} />
      <Text style={s.linkText}>{title}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}
const s = StyleSheet.create({
  action: {
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primary: { backgroundColor: colors.green },
  secondary: { backgroundColor: "transparent", paddingHorizontal: 2 },
  actionText: { fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: 8,
  },
  title: {
    flex: 1,
    fontFamily: serif,
    fontSize: 27,
    lineHeight: 34,
    color: colors.ink,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.pale,
    alignItems: "center",
    justifyContent: "center",
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  linkText: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: "500" },
});
