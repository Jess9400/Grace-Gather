import { useRef, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { q } from "../lib/quiet-copy";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Screen, Notice, colors } from "./quiet-ui";
import { TextAction } from "./CommunityControls";
import { useApp } from "../lib/state";
import { backend } from "../lib/backend";
import { continueJournal } from "../lib/ai";
import { AI_CONSENT_VERSION } from "../lib/ai-copy";
import { copy, needsSupport, type Entry } from "../lib/content";
import { chatCopy } from "../lib/journal-chat-copy";
import { jc, type JournalCopyKey } from "../lib/journal-copy";
export default function JournalConversation({
  entry,
  initialAction,
  onAction,
  children,
}: {
  children: ReactNode;
  entry: Entry;
  initialAction: string;
  onAction: (id: string) => void;
}) {
  const { profile, appendJournalMessages } = useApp();
  const [details, setDetails] = useState(false),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const lock = useRef(false);
  const lang = profile.language,
    messages = entry.conversation ?? [];
  const pending = messages.at(-1)?.role === "user";
  const enabled = profile.journalAIConsentVersion === AI_CONSENT_VERSION;
  const full = messages.length >= 40;
  async function send() {
    if (
      lock.current ||
      full ||
      !enabled ||
      !backend ||
      (!pending && !text.trim())
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNeedsSignIn(false);
    let saved = entry;
    try {
      if (!pending) {
        saved = await appendJournalMessages(entry.id, [
          { id: randomUUID(), role: "user", content: text.trim() },
        ]);
        setText("");
      }
    } catch {
      setError(chatCopy(lang, "saveFailed"));
      setBusy(false);
      lock.current = false;
      return;
    }
    try {
      const history = saved.conversation ?? [];
      const result = needsSupport(history.at(-1)!.content)
        ? { content: "", support: true }
        : await continueJournal(saved, profile, history, [
            ...new Set([
              initialAction,
              ...history.flatMap((m) => (m.actionId ? [m.actionId] : [])),
            ]),
          ]);
      await appendJournalMessages(entry.id, [
        {
          id: `reply-${history.at(-1)!.id}`,
          role: "assistant",
          ...result,
          content: result.support ? copy(lang, "supportDesc") : result.content,
        },
      ]);
    } catch (error) {
      setNeedsSignIn(
        error instanceof Error && error.message.startsWith("Sign in"),
      );
      setError(chatCopy(lang, "failed"));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const unavailable = !backend || !enabled || full;
  const composer = entry.safety ? undefined : (
    <View style={s.dock}>
      {details && <Text style={s.meta}>{chatCopy(lang, "privacy")}</Text>}
      <View style={s.composer}>
        <TextInput
          accessibilityLabel={chatCopy(lang, "label")}
          placeholder={q(lang, "next")}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={1500}
          value={text}
          onChangeText={setText}
          editable={!busy && !pending && !full}
          style={s.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={chatCopy(lang, pending ? "retry" : "send")}
          accessibilityState={{
            disabled: unavailable || busy || (!pending && !text.trim()),
          }}
          disabled={unavailable || busy || (!pending && !text.trim())}
          onPress={() => void send()}
          style={[
            s.send,
            (unavailable || busy || (!pending && !text.trim())) && {
              opacity: 0.4,
            },
          ]}
        >
          <Ionicons
            name={pending ? "refresh" : "arrow-up"}
            size={23}
            color={colors.paper}
          />
        </Pressable>
      </View>
      <View style={s.metaRow}>
        <Text style={[s.meta, { flex: 1 }]}>
          {busy
            ? chatCopy(lang, "waiting")
            : !backend
              ? chatCopy(lang, "local")
              : full
                ? chatCopy(lang, "limit")
                : !enabled
                  ? chatCopy(lang, "consent")
                  : chatCopy(lang, "ai")}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={chatCopy(lang, "privacy")}
          accessibilityState={{ expanded: details }}
          onPress={() => setDetails(!details)}
          style={s.info}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.muted}
          />
        </Pressable>
      </View>
      {!!backend && !enabled && (
        <TextAction
          title={chatCopy(lang, "preferences")}
          onPress={() => router.push("/preferences")}
        />
      )}
      <Notice text={error} />
      {needsSignIn && (
        <TextAction
          title={chatCopy(lang, "signin")}
          onPress={() => router.push("/account")}
        />
      )}
    </View>
  );
  return (
    <Screen back footer={composer} scrollToEndKey={messages.at(-1)?.id}>
      {children}
      {!entry.safety && messages.length > 0 && (
        <View style={s.thread}>
          {messages.map((m, index) => (
            <View key={m.id} style={m.role === "user" ? s.user : s.assistant}>
              <Text style={s.meta}>
                {chatCopy(lang, m.role === "user" ? "you" : "ai")}
              </Text>
              <Text selectable style={s.message}>
                {m.support ? copy(lang, "supportDesc") : m.content}
              </Text>
              {m.actionId && index === messages.length - 1 && !m.support && (
                <TextAction
                  title={jc(lang, m.actionId as JournalCopyKey)}
                  icon="arrow-forward"
                  onPress={() => onAction(m.actionId!)}
                />
              )}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  dock: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    backgroundColor: colors.paper,
    gap: 4,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 44,
    maxHeight: 120,
    padding: 8,
    color: colors.ink,
    textAlignVertical: "top",
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  metaRow: { flexDirection: "row", alignItems: "center", paddingLeft: 8 },
  meta: { fontSize: 12, lineHeight: 18, color: colors.muted },
  info: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  thread: { gap: 24, paddingTop: 12 },
  user: {
    alignSelf: "flex-end",
    maxWidth: "88%",
    padding: 16,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    backgroundColor: "#FFFFFF",
    gap: 6,
  },
  assistant: { alignSelf: "stretch", gap: 8, paddingVertical: 8 },
  message: { fontSize: 16, lineHeight: 26, color: colors.ink },
});
