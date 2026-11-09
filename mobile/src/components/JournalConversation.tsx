import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentRef, ReactNode } from "react";
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
import { shouldSendJournalKey } from "../lib/journal-composer";
import {
  currentJournalAction,
  JOURNAL_MESSAGE_LIMIT,
} from "../lib/journal-chat";
import JournalActionButton from "./JournalActionButton";
export default function JournalConversation({
  entry,
  initialAction,
  initialActionTitle,
  onAction,
  children,
}: {
  children: ReactNode;
  entry: Entry;
  initialAction: string;
  initialActionTitle: string;
  onAction: (id: string) => void;
}) {
  const { profile, appendJournalMessages } = useApp();
  const [details, setDetails] = useState(false),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const thread = useRef<ComponentRef<typeof ScrollView>>(null);
  const followLatest = useRef(true);
  const previousOffset = useRef(0);
  const lock = useRef(false);
  const lang = profile.language,
    messages = entry.conversation ?? [];
  const pending = messages.at(-1)?.role === "user";
  const enabled = profile.journalAIConsentVersion === AI_CONSENT_VERSION;
  const full = messages.length >= JOURNAL_MESSAGE_LIMIT;
  const latestAction = currentJournalAction(messages, initialAction);
  useEffect(() => {
    if (!chatOpen) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setChatOpen(false);
        return true;
      },
    );
    return () => subscription.remove();
  }, [chatOpen]);
  function openChat() {
    followLatest.current = true;
    if (!chatOpen) previousOffset.current = 0;
    setChatOpen(true);
  }
  function openAction(actionId: string) {
    setChatOpen(false);
    onAction(actionId);
  }
  async function send() {
    if (lock.current || full || (!pending && !text.trim())) return;
    if (!backend || !enabled) {
      setError(chatCopy(lang, !backend ? "local" : "consent"));
      return;
    }
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
    openChat();
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
      setError(
        chatCopy(
          lang,
          error instanceof Error && error.message === "rate_limited"
            ? "rateLimit"
            : error instanceof Error && error.message === "provider_busy"
              ? "providerBusy"
              : "failed",
        ),
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const unavailable = full;
  const composer = entry.safety ? undefined : (
    <View style={s.dock}>
      {chatOpen && latestAction && (
        <JournalActionButton
          title={
            latestAction.messageId
              ? jc(lang, latestAction.actionId as JournalCopyKey)
              : initialActionTitle
          }
          onPress={() => openAction(latestAction.actionId)}
        />
      )}
      {!chatOpen && messages.length > 0 && (
        <TextAction
          title={chatCopy(lang, "open")}
          icon="chatbubbles-outline"
          onPress={openChat}
        />
      )}
      {details && <Text style={s.meta}>{chatCopy(lang, "privacy")}</Text>}
      <View style={s.chatFrame}>
        <View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[s.cloudCorner, s.cloudLeft]}
        >
          <Image
            source={require("../../assets/journal/cloud-books-compact.png")}
            style={[s.cloudArt, { left: 0 }]}
            resizeMode="contain"
            accessible={false}
          />
        </View>
        <View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[s.cloudCorner, s.cloudRight]}
        >
          <Image
            source={require("../../assets/journal/cloud-books-compact.png")}
            style={[s.cloudArt, { right: 0 }]}
            resizeMode="contain"
            accessible={false}
          />
        </View>
        <View style={[s.composer, focused && s.composerFocused]}>
          <TextInput
            accessibilityLabel={chatCopy(lang, "label")}
            placeholder={chatCopy(lang, "prompt")}
            placeholderTextColor={colors.muted}
            multiline
            returnKeyType="send"
            submitBehavior={Platform.OS === "web" ? "newline" : "submit"}
            onSubmitEditing={
              Platform.OS === "web" ? undefined : () => void send()
            }
            onKeyPress={(event) => {
              if (
                Platform.OS === "web" &&
                shouldSendJournalKey(event.nativeEvent)
              ) {
                event.preventDefault();
                void send();
              }
            }}
            maxLength={1500}
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
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
      </View>
      <View style={s.metaRow}>
        <Text style={[s.meta, { flex: 1 }]}>
          {busy
            ? chatCopy(lang, "waiting")
            : error
              ? ""
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
          onPress={() => {
            setChatOpen(false);
            router.push("/preferences");
          }}
        />
      )}
      <Notice text={error} />
      {needsSignIn && (
        <TextAction
          title={chatCopy(lang, "signin")}
          onPress={() => {
            setChatOpen(false);
            router.push("/profile");
          }}
        />
      )}
    </View>
  );
  if (chatOpen && !entry.safety)
    return (
      <SafeAreaView style={s.fill}>
        <KeyboardAvoidingView
          style={s.fill}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.chatPage}>
            <View style={s.header}>
              <TextAction
                title={chatCopy(lang, "reflection")}
                icon="chevron-back"
                onPress={() => setChatOpen(false)}
              />
              <Text style={s.meta}>{chatCopy(lang, "ai")}</Text>
            </View>
            <ScrollView
              ref={thread}
              style={s.messageViewport}
              contentContainerStyle={s.thread}
              keyboardShouldPersistTaps="handled"
              onScroll={({
                nativeEvent: { contentOffset, contentSize, layoutMeasurement },
              }) => {
                const nearEnd =
                  contentSize.height -
                    contentOffset.y -
                    layoutMeasurement.height <
                  80;
                // Content growth also fires scroll events. Only an upward scroll
                // means the reader chose history instead of following replies.
                if (nearEnd) followLatest.current = true;
                else if (contentOffset.y < previousOffset.current - 1)
                  followLatest.current = false;
                previousOffset.current = contentOffset.y;
              }}
              scrollEventThrottle={32}
              onContentSizeChange={() => {
                if (followLatest.current)
                  thread.current?.scrollToEnd({ animated: false });
              }}
              onLayout={() => {
                if (followLatest.current)
                  thread.current?.scrollToEnd({ animated: false });
              }}
            >
              {messages.map((m) => (
                <View
                  key={m.id}
                  style={m.role === "user" ? s.user : s.assistant}
                >
                  <Text style={s.meta}>
                    {chatCopy(lang, m.role === "user" ? "you" : "ai")}
                  </Text>
                  <Text selectable style={s.message}>
                    {m.support ? copy(lang, "supportDesc") : m.content}
                  </Text>
                  {m.role === "assistant" &&
                    m.actionId &&
                    m.id !== latestAction?.messageId &&
                    !m.support && (
                      <JournalActionButton
                        title={jc(lang, m.actionId as JournalCopyKey)}
                        onPress={() => openAction(m.actionId!)}
                      />
                    )}
                </View>
              ))}
            </ScrollView>
            {composer}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  return (
    <Screen back footer={composer}>
      {children}
    </Screen>
  );
}
const s = StyleSheet.create({
  fill: { flex: 1, minHeight: 0, backgroundColor: colors.paper },
  chatPage: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  messageViewport: { flex: 1, minHeight: 0 },
  dock: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    backgroundColor: colors.paper,
    gap: 4,
  },
  chatFrame: {
    paddingTop: 32,
    paddingBottom: 6,
  },
  cloudCorner: {
    position: "absolute",
    top: -16,
    width: 140,
    height: 72,
    overflow: "hidden",
  },
  cloudLeft: { left: -4 },
  cloudRight: { right: -4 },
  cloudArt: {
    position: "absolute",
    top: -86,
    width: 460,
    height: 230,
  },
  composerFocused: { borderColor: colors.gold },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    padding: 12,
    minHeight: 96,
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
  thread: { gap: 24, padding: 20, paddingBottom: 32 },
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
