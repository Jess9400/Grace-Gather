import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Field, Notice, colors, serif } from "./quiet-ui";
import { TextAction, Disclosure } from "./CommunityControls";
import ChatThread from "./ChatThread";
import { useApp } from "../lib/state";
import { copy, needsSupport } from "../lib/content";
import { friendCopy } from "../lib/friends-copy";
import { roomTheme } from "../lib/people-theme";
import {
  GROUP_PAGE,
  groupChats,
  groupChatProblem,
  localized,
  mergeGroupMessages,
  type GroupChat,
  type GroupMessage,
  type GroupReport,
} from "../lib/group-chats";

const PROBLEM = {
  unavailable: "Group chats are not available yet.",
  rate_limited: "You are writing quickly. Please wait a moment.",
  name_required:
    "Choose a public name to write here. Only this name is shown with your messages.",
  failed: "Could not complete this. Please try again.",
} as const;

// The list of open rooms, each a card in its own colour.
export default function GroupChats({
  moderator,
  onOpen,
  onUnavailable,
}: {
  moderator: boolean;
  onOpen: (chat: GroupChat, myName: string | null) => void;
  // The server part is not set up yet; the screen can show friends instead.
  onUnavailable: () => void;
}) {
  const { profile } = useApp(),
    lang = profile.language,
    c = (key: string) => friendCopy(lang, key);
  const [chats, setChats] = useState<GroupChat[] | null>(null),
    [myName, setMyName] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [reports, setReports] = useState<GroupReport[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void groupChats("list")
        .then((data: { me: { name: string } | null; chats: GroupChat[] }) => {
          if (!alive) return;
          setChats(data.chats);
          setMyName(data.me?.name ?? null);
          setNotice("");
        })
        .catch((error) => {
          if (!alive) return;
          const problem = groupChatProblem(error);
          setNotice(PROBLEM[problem]);
          if (problem === "unavailable") onUnavailable();
        });
      return () => {
        alive = false;
      };
    }, [onUnavailable]),
  );
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (error) {
      setNotice(PROBLEM[groupChatProblem(error)]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Text style={s.intro}>
        {c("Open rooms for the whole community. Moderators keep them kind.")}
      </Text>
      <Notice text={notice ? c(notice) : ""} />
      {chats?.map((chat) => {
        const theme = roomTheme(chat.slug);
        const title = localized(chat.title, lang);
        return (
          <Pressable
            key={chat.id}
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${localized(chat.description, lang)}`}
            onPress={() => onOpen(chat, myName)}
            style={({ pressed }) => [
              s.card,
              { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={s.cardTop}>
              <View style={s.tag}>
                <View style={[s.dot, { backgroundColor: theme.dot }]} />
                <Text style={s.tagText}>{c("Open to everyone")}</Text>
              </View>
              <Text style={s.when}>
                {chat.latest_at
                  ? new Date(chat.latest_at).toLocaleString(lang, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : c("No messages yet")}
              </Text>
            </View>
            <Text style={s.title}>{title}</Text>
            <Text style={s.description}>
              {localized(chat.description, lang)}
            </Text>
          </Pressable>
        );
      })}
      {moderator && chats && (
        <Disclosure title={c("Group chat reports")}>
          <TextAction
            title={c("Refresh")}
            onPress={() =>
              void run(async () => setReports(await groupChats("reports")))
            }
          />
          {reports?.map((r) => (
            <Card key={r.id}>
              <Body>{r.body}</Body>
              <Body small>
                {r.name || c("Member")} · {r.reason}
              </Body>
              <Button
                title={c("Remove message")}
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    await groupChats("resolve_report", {
                      id: r.id,
                      remove: true,
                    });
                    setReports(await groupChats("reports"));
                  })
                }
              />
              <TextAction
                title={c("Keep message")}
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    await groupChats("resolve_report", { id: r.id });
                    setReports(await groupChats("reports"));
                  })
                }
              />
            </Card>
          ))}
        </Disclosure>
      )}
    </>
  );
}

// One open room, full screen.
export function GroupRoom({
  chat,
  initialName,
  onBack,
}: {
  chat: GroupChat;
  initialName: string | null;
  onBack: () => void;
}) {
  const { profile } = useApp(),
    lang = profile.language,
    c = (key: string) => friendCopy(lang, key);
  const [messages, setMessages] = useState<GroupMessage[]>([]),
    [loaded, setLoaded] = useState(false),
    [older, setOlder] = useState(false);
  const [myName, setMyName] = useState(initialName),
    [nameDraft, setNameDraft] = useState(initialName ?? ""),
    [notice, setNotice] = useState(""),
    [support, setSupport] = useState(false),
    [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const latest: GroupMessage[] = await groupChats("messages", {
      chat: chat.id,
    });
    setMessages((previous) => mergeGroupMessages(previous, latest));
    return latest;
  }, [chat.id]);
  useEffect(() => {
    let alive = true;
    void groupChats("messages", { chat: chat.id })
      .then((latest: GroupMessage[]) => {
        if (!alive) return;
        setMessages(latest);
        setOlder(latest.length === GROUP_PAGE);
        setLoaded(true);
      })
      .catch((error) => {
        if (alive) setNotice(PROBLEM[groupChatProblem(error)]);
      });
    return () => {
      alive = false;
    };
  }, [chat.id]);
  // Refresh only while this room is on screen; older pages and the draft stay.
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => void refresh().catch(() => {}), 10000);
      return () => clearInterval(timer);
    }, [refresh]),
  );
  async function run(action: () => Promise<void>) {
    if (busy) return false;
    setBusy(true);
    setNotice("");
    try {
      await action();
      return true;
    } catch (error) {
      setNotice(PROBLEM[groupChatProblem(error)]);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const theme = roomTheme(chat.slug);
  return (
    <ChatThread
      title={localized(chat.title, lang)}
      subtitle={c("Open to everyone")}
      tint={theme.tint}
      rule={c(
        "Be kind. Moderators look after this chat, and anything unkind is removed. Everyone in the community can read it, so please do not share private details.",
      )}
      backLabel={c("Back")}
      onBack={onBack}
      menuLabel={c("More")}
      menu={[
        {
          title: c("Refresh"),
          onPress: () =>
            void run(async () => {
              await refresh();
            }),
        },
      ]}
      messages={messages}
      locale={lang}
      empty={loaded ? c("No messages yet. Be the first to say hello.") : ""}
      olderLabel={c("Older messages")}
      onOlder={
        older && messages[0]
          ? () =>
              void run(async () => {
                const page: GroupMessage[] = await groupChats("messages", {
                  chat: chat.id,
                  before: messages[0].created_at,
                  beforeId: messages[0].id,
                });
                setMessages([...page, ...messages]);
                setOlder(page.length === GROUP_PAGE);
              })
          : undefined
      }
      actionsHint={c("Report or block")}
      renderActions={(message, close) => (
        <GroupMessageActions
          busy={busy}
          c={c}
          onReport={(reason) =>
            void run(async () => {
              await groupChats("report", { message: message.id, reason });
              close();
            }).then((ok) => ok && setNotice("Report sent"))
          }
          onBlock={() =>
            void run(async () => {
              await groupChats("block", { message: message.id });
              close();
              await refresh();
            }).then((ok) => ok && setNotice("Member blocked"))
          }
          onCancel={close}
        />
      )}
      notice={notice ? c(notice) : ""}
      // Someone writing about harming themselves sees where to find help.
      extraNotice={support ? copy(lang, "supportDesc") : undefined}
      placeholder={c("Write something kind…")}
      sendLabel={c("Send")}
      maxLength={1000}
      busy={busy}
      onSend={(text) =>
        run(async () => {
          await groupChats("send", { chat: chat.id, body: text });
          setSupport(needsSupport(text));
          const latest = await refresh();
          if (latest.length < GROUP_PAGE) setOlder(false);
        })
      }
      composer={
        myName ? undefined : (
          <View style={{ gap: 8 }}>
            <Body small>
              {c(
                "Choose a public name to write here. Only this name is shown with your messages.",
              )}
            </Body>
            <Field
              label={c("Your public name")}
              value={nameDraft}
              onChangeText={setNameDraft}
              maxLength={40}
            />
            <Button
              title={c("Save")}
              disabled={busy || nameDraft.trim().length < 2}
              onPress={() =>
                void run(async () => {
                  await groupChats("name", { name: nameDraft });
                  setMyName(nameDraft.trim());
                })
              }
            />
          </View>
        )
      }
    />
  );
}

// What you can do about someone else's message in a room.
function GroupMessageActions({
  busy,
  c,
  onReport,
  onBlock,
  onCancel,
}: {
  busy: boolean;
  c: (key: string) => string;
  onReport: (reason: string) => void;
  onBlock: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"report" | "block" | null>(null),
    [reason, setReason] = useState("");
  if (mode === "report")
    return (
      <>
        <Field
          label={c("Reason for report")}
          value={reason}
          onChangeText={setReason}
          maxLength={500}
        />
        <Button
          title={c("Report")}
          disabled={busy || reason.trim().length < 3}
          onPress={() => onReport(reason)}
        />
        <TextAction title={c("Cancel")} onPress={onCancel} />
      </>
    );
  if (mode === "block")
    return (
      <>
        <Body>
          {c("Block this member?")}{" "}
          {c(
            "You will stop seeing each other's messages, and any friendship between you ends.",
          )}
        </Body>
        <Button title={c("Block")} disabled={busy} onPress={onBlock} />
        <TextAction title={c("Cancel")} onPress={onCancel} />
      </>
    );
  return (
    <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
      <TextAction title={c("Report")} onPress={() => setMode("report")} />
      <TextAction title={c("Block")} onPress={() => setMode("block")} />
    </View>
  );
}

const s = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 20, color: colors.muted },
  card: {
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 22,
    boxShadow: "0px 8px 20px rgba(48,44,40,0.07)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tag: {
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.75)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tagText: { fontSize: 12, fontWeight: "700", color: colors.ink },
  when: { flexShrink: 1, fontSize: 12, color: "#5F564D" },
  title: { fontFamily: serif, fontSize: 21, lineHeight: 26, color: colors.ink },
  description: { fontSize: 14, lineHeight: 20, color: "#4A433C" },
});
