import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./community-ui";
import { serif } from "./quiet-ui";

/** The gathering that is happening right now, shown at the top of Gather. */
export function LiveNowBanner({
  eyebrow,
  title,
  detail,
  action,
  onPress,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${eyebrow}: ${title}. ${detail}. ${action}`}
      onPress={onPress}
      style={({ pressed }) => [styles.live, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.liveDot} accessible={false} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.liveEyebrow}>{eyebrow.toUpperCase()}</Text>
        <Text style={styles.liveTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.liveDetail}>{detail}</Text>
      </View>
      <View style={styles.livePill}>
        <Text style={styles.livePillText}>{action}</Text>
      </View>
    </Pressable>
  );
}

/** A visible way into private chats with friends. */
export function ChatsStrip({
  title,
  hint,
  onPress,
}: {
  title: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      onPress={onPress}
      style={({ pressed }) => [styles.strip, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={styles.stripIcon}>
        <Ionicons
          name="chatbubbles-outline"
          size={22}
          color={colors.ink}
          accessible={false}
        />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={styles.stripTitle}>{title}</Text>
        <Text style={styles.stripHint}>{hint}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.muted}
        accessible={false}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  live: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 44,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: colors.night,
    borderWidth: 1,
    borderColor: "#C9A45C66",
  },
  liveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E0BE76",
  },
  liveEyebrow: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "700",
    color: "#E0BE76",
  },
  liveTitle: { fontFamily: serif, fontSize: 19, color: colors.ink },
  liveDetail: { fontSize: 13, lineHeight: 18, color: "#CDBFA8" },
  livePill: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  livePillText: { fontSize: 14, fontWeight: "700", color: colors.ink },
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  stripIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pale,
  },
  stripTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  stripHint: { fontSize: 13, lineHeight: 18, color: colors.muted },
});
