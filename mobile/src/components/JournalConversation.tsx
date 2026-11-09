import { useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Body, Card, Field, Button, Notice, colors } from "./quiet-ui";
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
}: {
  entry: Entry;
  initialAction: string;
  onAction: (id: string) => void;
}) {
  const { profile, appendJournalMessages } = useApp();
  const [open, setOpen] = useState(false),
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
  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      <TextAction
        title={chatCopy(lang, open ? "close" : "open")}
        icon="chatbubble-outline"
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Body>{chatCopy(lang, "intro")}</Body>
          <Body small>{chatCopy(lang, "privacy")}</Body>
          {messages.map((m, index) => (
            <Card key={m.id}>
              <Body small>
                {chatCopy(lang, m.role === "user" ? "you" : "ai")}
              </Body>
              <Body>{m.support ? copy(lang, "supportDesc") : m.content}</Body>
              {m.actionId && index === messages.length - 1 && !m.support && (
                <TextAction
                  title={jc(lang, m.actionId as JournalCopyKey)}
                  icon="arrow-forward"
                  onPress={() => onAction(m.actionId!)}
                />
              )}
            </Card>
          ))}
          {!backend ? (
            <Notice text={chatCopy(lang, "local")} />
          ) : !enabled ? (
            <>
              <Body small>{chatCopy(lang, "consent")}</Body>
              <TextAction
                title={chatCopy(lang, "preferences")}
                onPress={() => router.push("/preferences")}
              />
            </>
          ) : full ? (
            <Body small>{chatCopy(lang, "limit")}</Body>
          ) : (
            <>
              {!pending && (
                <Field
                  label={chatCopy(lang, "label")}
                  multiline
                  maxLength={1500}
                  value={text}
                  onChangeText={setText}
                  editable={!busy}
                  style={{ minHeight: 90, color: colors.ink }}
                />
              )}
              <Button
                secondary
                title={chatCopy(
                  lang,
                  busy ? "waiting" : pending ? "retry" : "send",
                )}
                disabled={busy || (!pending && !text.trim())}
                onPress={() => void send()}
              />
            </>
          )}
          <Notice text={error} />
          {needsSignIn && (
            <TextAction
              title={chatCopy(lang, "signin")}
              onPress={() => router.push("/account")}
            />
          )}
        </>
      )}
    </View>
  );
}
