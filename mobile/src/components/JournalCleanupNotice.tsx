import { useEffect, useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../lib/state";
import { colors } from "./quiet-ui";
import { journalCopy } from "../lib/journal-library-copy";
export default function JournalCleanupNotice({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { entries, profile, acknowledgeJournalNotices, keepConversation } =
    useApp();
  const [dismissed, setDismissed] = useState("");
  const [error, setError] = useState("");
  const pending = profile.deleteJournalChatsAfter90Days
    ? entries.filter((e) => e.chatCleanup)
    : [];
  const signature = pending
    .map((e) => e.id + e.chatCleanup!.deleteAt)
    .join("|");
  const unseen = pending
    .filter((e) => !e.chatCleanup?.seenAt)
    .map((e) => e.id)
    .join("|");
  const visible = pending.length > 0 && (!compact || dismissed !== signature);
  useEffect(() => {
    if (visible && unseen)
      void acknowledgeJournalNotices(unseen.split("|")).catch(() =>
        setError(journalCopy(profile.language, "failed")),
      );
    // Acknowledging changes entry objects; the unseen IDs are the effect boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, unseen]);
  if (!visible) return null;
  const t = (key: Parameters<typeof journalCopy>[1]) =>
    journalCopy(profile.language, key);
  if (compact)
    return (
      <View style={s.banner}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/history?section=cleanup")}
          style={{ flex: 1, padding: 12 }}
        >
          <Text style={s.title}>
            {t("cleanupTitle")} · {pending.length}
          </Text>
          <Text style={s.small}>{t("review")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("cancel")}
          onPress={() => setDismissed(signature)}
          style={s.close}
        >
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>
    );
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.title}>{t("cleanupTitle")}</Text>
      {!!error && <Text style={s.small}>{error}</Text>}
      {pending.map((e) => (
        <View style={s.notice} key={e.id}>
          <Text style={s.title}>
            {new Date(e.createdAt).toLocaleDateString(profile.language, {
              dateStyle: "medium",
            })}
          </Text>
          <Text style={s.small}>
            {t("cleanupDate")}{" "}
            {new Date(e.chatCleanup!.deleteAt).toLocaleDateString(
              profile.language,
              { dateStyle: "medium" },
            )}
          </Text>
          <View style={s.actions}>
            <Pressable
              accessibilityRole="button"
              style={s.action}
              onPress={() =>
                void keepConversation(e.id).catch(() => setError(t("failed")))
              }
            >
              <Text style={s.title}>{t("keep")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={s.action}
              onPress={() =>
                router.push({
                  pathname: "/journal-export",
                  params: { entryId: e.id, chat: "1" },
                })
              }
            >
              <Text style={s.title}>{t("export")}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  banner: {
    backgroundColor: colors.pale,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  notice: {
    backgroundColor: colors.pale,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  title: { fontSize: 14, lineHeight: 21, color: colors.ink, fontWeight: "500" },
  small: { fontSize: 12, lineHeight: 19, color: colors.muted },
  actions: { flexDirection: "row", gap: 20 },
  action: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  close: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
