import { usePrayerUnread } from "../lib/prayers";
import { router, type Href } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./quiet-ui";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { useApp } from "../lib/state";
import { jc } from "../lib/journal-copy";
import { copy } from "../lib/content";

type Icon = React.ComponentProps<typeof Ionicons>["name"];
export function AccountMenuRow({
  title,
  icon,
  route,
  detail,
  onNavigate,
}: {
  title: string;
  icon: Icon;
  route: Href;
  detail?: string;
  onNavigate?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        onNavigate?.();
        router.push(route);
      }}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      <Ionicons name={icon} size={21} color={colors.ink} />
      <View style={s.copy}>
        <Text style={s.title}>{title}</Text>
        {detail ? <Text style={s.detail}>{detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

export default function AccountMenuContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const tr = useInterfaceCopy();
  const unread = usePrayerUnread();
  const { profile } = useApp();
  const tradition = profile.faithChoice;
  const detail =
    tradition === "catholic" ||
    tradition === "protestant" ||
    tradition === "orthodox"
      ? copy(profile.language, tradition)
      : undefined;
  return (
    <View>
      <AccountMenuRow
        title={tr("Profile")}
        icon="person-outline"
        route="/profile"
        onNavigate={onNavigate}
      />
      <AccountMenuRow
        title={tr("My Journal")}
        icon="book-outline"
        route="/history"
        onNavigate={onNavigate}
      />
      <AccountMenuRow
        title={jc(profile.language, "pay")}
        icon="leaf-outline"
        route="/giving"
        onNavigate={onNavigate}
      />
      <AccountMenuRow
        title={tr("Community")}
        icon="people-outline"
        route="/community"
        onNavigate={onNavigate}
      />
      <AccountMenuRow
        title={tr("Prayer requests")}
        icon="heart-outline"
        route="/prayers"
        onNavigate={onNavigate}
      />
      <AccountMenuRow
        title={tr("Notifications")}
        detail={unread ? String(unread) : undefined}
        icon="notifications-outline"
        route="/notifications"
        onNavigate={onNavigate}
      />
      <View style={s.divider} />
      <AccountMenuRow
        title={tr("Church preferences")}
        detail={detail}
        icon="options-outline"
        route="/practices"
        onNavigate={onNavigate}
      />
    </View>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pressed: { backgroundColor: "#302C280A" },
  copy: { flex: 1, gap: 3 },
  title: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  detail: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginHorizontal: 12,
    marginVertical: 8,
  },
});
