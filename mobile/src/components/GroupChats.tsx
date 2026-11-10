import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Field, Notice, colors, serif } from "./quiet-ui";
import { TextAction, Disclosure } from "./CommunityControls";
import { useApp } from "../lib/state";
import { copy, needsSupport } from "../lib/content";
import { friendCopy } from "../lib/friends-copy";
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

// Open rooms where any signed-in member can read and write. `onRoom` tells the
// screen whether a room is open, so it can hide its Friends / Group chats tabs.
export default function GroupChats({
  moderator,
  onRoom,
}: {
  moderator: boolean;
  onRoom: (open: boolean) => void;
}) {
  const { profile } = useApp(),
    lang = profile.language,
    c = (key: string) => friendCopy(lang, key);
  const [chats, setChats] = useState<GroupChat[] | null>(null),
    [myName, setMyName] = useState<string | null>(null),
    [active, setActive] = useState<GroupChat | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]),
    [older, setOlder] = useState(false);
  const [body, setBody] = useState(""),
    [nameDraft, setNameDraft] = useState(""),
    [notice, setNotice] = useState(""),
    [support, setSupport] = useState(false),
    [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null),
    [reason, setReason] = useState(""),
    [blocking, setBlocking] = useState<GroupMessage | null>(null);
  const [reports, setReports] = useState<GroupReport[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void groupChats("list")
        .then((data: { me: { name: string } | null; chats: GroupChat[] }) => {
          if (!alive) return;
          setChats(data.chats);
          setMyName(data.me?.name ?? null);
          setNameDraft((draft) => draft || (data.me?.name ?? ""));
        })
        .catch((error) => {
          if (alive) setNotice(PROBLEM[groupChatProblem(error)]);
        });
      return () => {
        alive = false;
      };
    }, []),
  );
  // Refresh only while this room is on screen; older pages and the draft stay.
  useFocusEffect(
    useCallback(() => {
      if (!active) return;
      let alive = true;
      const timer = setInterval(() => {
        void groupChats("messages", { chat: active.id })
          .then((latest: GroupMessage[]) => {
            if (alive)
              setMessages((previous) => mergeGroupMessages(previous, latest));
          })
          .catch(() => {});
      }, 10000);
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, [active]),
  );
  useEffect(() => onRoom(!!active), [active, onRoom]);

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
  async function refresh(chat: GroupChat) {
    const latest: GroupMessage[] = await groupChats("messages", {
      chat: chat.id,
    });
    setMessages((previous) => mergeGroupMessages(previous, latest));
    return latest;
  }
  async function open(chat: GroupChat) {
    const latest: GroupMessage[] = await groupChats("messages", {
      chat: chat.id,
    });
    setMessages(latest);
    setOlder(latest.length === GROUP_PAGE);
    setActive(chat);
    setBody("");
    setReport(null);
    setBlocking(null);
    setSupport(false);
  }
  function close() {
    setActive(null);
    setMessages([]);
    setBody("");
    setReport(null);
    setBlocking(null);
    setSupport(false);
    setNotice("");
  }

  if (!active)
    return (
      <>
        <Notice text={notice ? c(notice) : ""} />
        {chats?.map((chat) => (
          <Card key={chat.id}>
            <Text accessibilityRole="header" style={s.title}>
              {localized(chat.title, lang)}
            </Text>
            <Body>{localized(chat.description, lang)}</Body>
            {chat.latest_at && (
              <Body small>
                {c("Last message")} ·{" "}
                {new Date(chat.latest_at).toLocaleString(lang)}
              </Body>
            )}
            <Button
              title={c("Open")}
              disabled={busy}
              onPress={() => void run(() => open(chat))}
            />
          </Card>
        ))}
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

  return (
    <>
      <TextAction
        icon="chevron-back"
        title={c("Back")}
        disabled={busy}
        onPress={close}
      />
      <Text accessibilityRole="header" style={s.title}>
        {localized(active.title, lang)}
      </Text>
      <Body small>
        {c(
          "Everyone in the community can read this room. Please do not share private details. Reported messages are reviewed by moderators.",
        )}
      </Body>
      <View style={s.actions}>
        <TextAction
          title={c("Refresh")}
          disabled={busy}
          onPress={() =>
            void run(async () => {
              await refresh(active);
            })
          }
        />
        {older && messages[0] && (
          <TextAction
            title={c("Older messages")}
            disabled={busy}
            onPress={() =>
              void run(async () => {
                const page: GroupMessage[] = await groupChats("messages", {
                  chat: active.id,
                  before: messages[0].created_at,
                  beforeId: messages[0].id,
                });
                setMessages([...page, ...messages]);
                setOlder(page.length === GROUP_PAGE);
              })
            }
          />
        )}
      </View>
      {messages.length === 0 && (
        <Body>{c("No messages yet. Be the first to say hello.")}</Body>
      )}
      {messages.map((m) => (
        <Card key={m.id}>
          <Body>{m.body}</Body>
          <Body small>
            {m.mine ? c("You") : m.name || c("Member")} ·{" "}
            {new Date(m.created_at).toLocaleString(lang)}
          </Body>
          {!m.mine && (
            <View style={s.actions}>
              <TextAction
                title={c("Report")}
                onPress={() => {
                  setBlocking(null);
                  setReport(m.id);
                  setReason("");
                }}
              />
              <TextAction
                title={c("Block")}
                onPress={() => {
                  setReport(null);
                  setBlocking(m);
                }}
              />
            </View>
          )}
          {report === m.id && (
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
                onPress={() =>
                  void run(async () => {
                    await groupChats("report", { message: m.id, reason });
                    setReport(null);
                    setNotice("Report sent");
                  })
                }
              />
            </>
          )}
          {blocking?.id === m.id && (
            <>
              <Body>
                {c("Block this member?")}{" "}
                {c(
                  "You will stop seeing each other's messages, and any friendship between you ends.",
                )}
              </Body>
              <Button
                title={c("Block")}
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    await groupChats("block", { message: m.id });
                    setBlocking(null);
                    await refresh(active);
                    setNotice("Member blocked");
                  })
                }
              />
              <TextAction
                title={c("Cancel")}
                onPress={() => setBlocking(null)}
              />
            </>
          )}
        </Card>
      ))}
      <Notice text={notice ? c(notice) : ""} />
      {support && <Notice text={copy(lang, "supportDesc")} />}
      {myName ? (
        <>
          <Field
            label={c("Write a message")}
            multiline
            value={body}
            onChangeText={setBody}
            maxLength={1000}
          />
          <Button
            title={c("Send")}
            disabled={busy || !body.trim()}
            onPress={() =>
              void run(async () => {
                const sent = body;
                await groupChats("send", { chat: active.id, body: sent });
                setBody("");
                // Someone writing about harming themselves sees where to find help.
                setSupport(needsSupport(sent));
                const latest = await refresh(active);
                if (latest.length < GROUP_PAGE) setOlder(false);
              })
            }
          />
        </>
      ) : (
        <>
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
        </>
      )}
    </>
  );
}
const s = StyleSheet.create({
  title: { fontFamily: serif, fontSize: 24, lineHeight: 30, color: colors.ink },
  actions: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
});
