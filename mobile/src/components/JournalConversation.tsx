import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Screen, Notice, Glass, colors } from "./quiet-ui";
import GlassBackdrop from "./GlassBackdrop";
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
  JOURNAL_MESSAGE_LIMIT,
  partitionJournalMessages,
} from "../lib/journal-chat";
import { journalCopy } from "../lib/journal-library-copy";
import JournalActionButton from "./JournalActionButton";
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
  const [focused, setFocused] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [olderOpen, setOlderOpen] = useState(false);
  const [scrollKey, setScrollKey] = useState<string>();
  const lock = useRef(false);
  const lang = profile.language,
    messages = entry.conversation ?? [];
  const pending = messages.at(-1)?.role === "user";
  const enabled = profile.journalAIConsentVersion === AI_CONSENT_VERSION;
  const full = messages.length >= JOURNAL_MESSAGE_LIMIT;
  const { older, recent } = partitionJournalMessages(messages);
  // The conversation reads as a dialogue: your words on the right, replies
  // on the left, both on the same glass as the letter above.
  const renderMessage = (m: (typeof messages)[number]) => (
    <Glass key={m.id} style={[s.bubble, m.role === "user" ? s.mine : s.theirs]}>
      <Text selectable style={s.message}>
        {m.support ? copy(lang, "supportDesc") : m.content}
      </Text>
      {m.role === "assistant" && m.actionId && !m.support && (
        <JournalActionButton
          title={jc(lang, m.actionId as JournalCopyKey)}
          onPress={() => onAction(m.actionId!)}
        />
      )}
    </Glass>
  );
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
    setScrollKey(saved.conversation?.at(-1)?.id);
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
      setScrollKey(`reply-${history.at(-1)!.id}`);
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
                    : ""}
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
      <Notice text={error} />
      {needsSignIn && (
        <TextAction
          title={chatCopy(lang, "signin")}
          onPress={() => {
            router.push("/profile");
          }}
        />
      )}
    </View>
  );
  return (
    <Screen
      back
      keyboard
      backdrop={<GlassBackdrop />}
      scrollToEndKey={scrollKey}
    >
      {children}
      {messages.length > 0 && (
        <View style={s.thread}>
          {older.length > 0 && (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: olderOpen }}
                onPress={() => setOlderOpen(!olderOpen)}
                style={s.olderControl}
              >
                <Text style={s.meta}>
                  {journalCopy(lang, "earlier")} · {older.length}
                </Text>
                <Ionicons
                  name={olderOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.muted}
                />
              </Pressable>
              {olderOpen && older.map(renderMessage)}
            </>
          )}
          {recent.map(renderMessage)}
        </View>
      )}
      {/* The reply box is part of the page, so the whole page scrolls. */}
      {composer}
    </Screen>
  );
}

const s = StyleSheet.create({
  olderControl: {
    minHeight: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dock: { marginTop: 4, gap: 4 },
  chatFrame: {
    paddingTop: 46,
    paddingBottom: 6,
  },
  cloudCorner: {
    position: "absolute",
    top: 0,
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
    padding: 10,
    paddingLeft: 14,
    minHeight: 64,
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
  thread: { gap: 14 },
  bubble: { padding: 18, gap: 12, maxWidth: "88%" },
  mine: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 6,
    backgroundColor: "#FFFFFFE6",
  },
  theirs: { alignSelf: "flex-start", borderTopLeftRadius: 6 },
  message: { fontSize: 15, lineHeight: 24, color: colors.ink },
});
