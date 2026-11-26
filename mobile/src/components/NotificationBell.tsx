import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePrayerUnread } from "../lib/prayers";
import { useInterfaceCopy } from "../lib/use-interface-copy";

/** The shared inbox owns the unread badge; the profile avatar stays clear. */
export default function NotificationBell({ onPress, elevated = false }: {
  onPress?: () => void;
  elevated?: boolean;
}) {
  const tr = useInterfaceCopy();
  const unread = usePrayerUnread();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={tr("Notifications")}
      accessibilityValue={{ text: String(unread) }}
      onPress={onPress ?? (() => router.push("/notifications"))}
      style={({ pressed }) => [styles.control, elevated && styles.elevated, pressed && styles.pressed]}>
      <Ionicons name="notifications-outline" size={23} color="#F4EBDA" />
      {unread > 0 && <View pointerEvents="none" style={styles.badge}>
        <Text style={styles.count}>{unread > 99 ? "99+" : unread}</Text>
      </View>}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  control: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  elevated: { backgroundColor: "rgba(27,22,18,0.35)" },
  pressed: { opacity: 0.7 },
  badge: { position: "absolute", right: 0, top: 0, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: "#F1E4CB", alignItems: "center", justifyContent: "center" },
  count: { color: "#1B1612", fontSize: 10, fontWeight: "700" },
});
