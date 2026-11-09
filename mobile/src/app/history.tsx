import { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Heading,
  Body,
  Field,
  Notice,
  colors,
} from "../components/quiet-ui";
import { FilterStrip, TextAction } from "../components/CommunityControls";
import JournalCleanupNotice from "../components/JournalCleanupNotice";
import { useQuiet } from "../lib/quiet-state";
import { useApp } from "../lib/state";
import { isArchived, recoveryEnds } from "../lib/journal-retention";
import { journalCopy } from "../lib/journal-library-copy";
const PAGE_SIZE = 10;
export default function History() {
  const {
    journalItems,
    profile,
    deleteEntry,
    restoreEntry,
    removeConversation,
    recoverConversation,
  } = useApp();
  const { clear } = useQuiet();
  const [tab, setTab] = useState("recent"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [confirm, setConfirm] = useState<{ id: string; chat?: boolean }>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const t = (key: Parameters<typeof journalCopy>[1]) =>
    journalCopy(profile.language, key);
  const saved = journalItems.filter((e) => !e.sessionOnly);
  const results = saved
    .filter(
      (e) =>
        !e.deletedAt && (tab === "archive" ? isArchived(e) : !isArchived(e)),
    )
    .filter((e) =>
      `${e.text} ${e.reflection ?? ""}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    );
  const trash = saved
    .flatMap((e) =>
      e.deletedAt
        ? [
            {
              entry: e,
              deletedAt: e.deletedAt,
              chatId: undefined as string | undefined,
            },
          ]
        : (e.deletedConversations ?? []).map((c) => ({
            entry: e,
            deletedAt: c.deletedAt,
            chatId: c.id,
          })),
    )
    .filter(({ entry }) =>
      entry.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  const total = tab === "trash" ? trash.length : results.length;
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1),
    currentPage = Math.min(page, lastPage);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      setConfirm(undefined);
    } catch {
      setError(t("failed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen back>
      <Heading>{t("journal")}</Heading>
      <View style={s.toolbar}>
        <TextAction
          title={t("newEntry")}
          icon="add"
          onPress={() => {
            clear();
            router.push("/(tabs)/diary");
          }}
        />
        <TextAction
          title={t("export")}
          icon="download-outline"
          onPress={() => router.push("/journal-export")}
        />
      </View>
      <JournalCleanupNotice />
      <FilterStrip
        options={[
          { value: "recent", label: t("recent") },
          { value: "archive", label: t("archive") },
          { value: "trash", label: t("trash") },
        ]}
        value={tab}
        onChange={(value) => {
          setTab(value);
          setPage(0);
          setConfirm(undefined);
        }}
      />
      <Field
        label={t("search")}
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setPage(0);
        }}
      />
      {tab === "archive" && <Body small>{t("archivedInfo")}</Body>}
      {tab === "trash" && <Body small>{t("trashInfo")}</Body>}
      <Notice text={error} />
      {!total && (
        <Body>
          {query ? t("noResults") : t(tab === "trash" ? "emptyTrash" : "empty")}
        </Body>
      )}
      {tab !== "trash" &&
        results
          .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
          .map((e) => (
            <View style={s.entry} key={e.id}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t("open")} · ${new Date(e.createdAt).toLocaleDateString(profile.language)}`}
                onPress={() =>
                  router.push({ pathname: "/entry/[id]", params: { id: e.id } })
                }
                style={s.open}
              >
                <View style={{ flex: 1, gap: 10 }}>
                  <Text style={s.date}>
                    {new Date(e.createdAt).toLocaleDateString(
                      profile.language,
                      { dateStyle: "long" },
                    )}
                  </Text>
                  <Text style={s.preview} numberOfLines={3}>
                    {e.text || t("audio")}
                  </Text>
                  {!!e.conversation?.length && (
                    <Text style={s.date}>
                      {t("conversation")} · {e.conversation.length}
                    </Text>
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.muted}
                />
              </Pressable>
              {confirm?.id === e.id ? (
                <View style={{ gap: 8 }}>
                  <Body small>
                    {t(confirm.chat ? "deleteChatConfirm" : "deleteEntry")}
                  </Body>
                  <View style={s.actions}>
                    <TextAction
                      title={t("delete")}
                      onPress={() =>
                        void run(() =>
                          confirm.chat
                            ? removeConversation(e.id)
                            : deleteEntry(e.id),
                        )
                      }
                    />
                    <TextAction
                      title={t("cancel")}
                      onPress={() => setConfirm(undefined)}
                    />
                  </View>
                </View>
              ) : (
                <View style={s.actions}>
                  <TextAction
                    title={t("delete")}
                    onPress={() => setConfirm({ id: e.id })}
                  />
                  {!!e.conversation?.length && (
                    <TextAction
                      title={t("deleteChat")}
                      onPress={() => setConfirm({ id: e.id, chat: true })}
                    />
                  )}
                </View>
              )}
            </View>
          ))}
      {tab === "trash" &&
        trash
          .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
          .map(({ entry: e, deletedAt, chatId }) => (
            <View style={s.entry} key={chatId ?? e.id}>
              <Text style={s.date}>
                {new Date(e.createdAt).toLocaleDateString(profile.language, {
                  dateStyle: "long",
                })}
                {chatId ? ` · ${t("conversation")}` : ""}
              </Text>
              <Text style={s.preview} numberOfLines={2}>
                {e.text || t("audio")}
              </Text>
              <Text style={s.date}>
                {t("recoverUntil")}{" "}
                {new Date(recoveryEnds(deletedAt)).toLocaleDateString(
                  profile.language,
                  { dateStyle: "medium" },
                )}
              </Text>
              <View style={s.actions}>
                <TextAction
                  title={t("restore")}
                  icon="arrow-undo-outline"
                  onPress={() =>
                    void run(() =>
                      chatId
                        ? recoverConversation(e.id, chatId)
                        : restoreEntry(e.id),
                    )
                  }
                />
                <TextAction
                  title={t("export")}
                  onPress={() =>
                    router.push({
                      pathname: "/journal-export",
                      params: {
                        entryId: e.id,
                        ...(chatId ? { deletedChatId: chatId } : {}),
                        chat: "1",
                      },
                    })
                  }
                />
              </View>
            </View>
          ))}
      {total > PAGE_SIZE && (
        <View style={s.pagination}>
          <Pressable
            accessibilityRole="button"
            disabled={currentPage === 0}
            onPress={() => setPage(currentPage - 1)}
            style={s.pageButton}
          >
            <Text style={[s.preview, currentPage === 0 && { opacity: 0.4 }]}>
              {t("previous")}
            </Text>
          </Pressable>
          <Text style={s.date}>
            {currentPage + 1} / {lastPage + 1}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={currentPage >= lastPage}
            onPress={() => setPage(currentPage + 1)}
            style={s.pageButton}
          >
            <Text
              style={[s.preview, currentPage >= lastPage && { opacity: 0.4 }]}
            >
              {t("next")}
            </Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  entry: {
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingVertical: 16,
    gap: 12,
  },
  open: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 8,
  },
  date: { fontSize: 12, lineHeight: 19, color: colors.muted },
  preview: { fontSize: 16, lineHeight: 25, color: colors.ink },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageButton: { minHeight: 44, padding: 8, justifyContent: "center" },
});
