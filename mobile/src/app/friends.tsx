import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Heading,
  Body,
  Field,
  Button,
  Card,
  Notice,
  colors,
} from "../components/quiet-ui";
import { TextAction, Disclosure } from "../components/CommunityControls";
import ChatThread from "../components/ChatThread";
import Discussions, {
  DiscussionRoom,
  StartDiscussion,
} from "../components/Discussions";
import { useApp } from "../lib/state";
import { useCommunity } from "../lib/discussion-state";
import {
  friends,
  markFriendMessagesRead,
  type Friend,
  type Message,
} from "../lib/friends";
import { friendCopy } from "../lib/friends-copy";
import { discussionVerseId, getReadingVerse } from "../lib/bible";
import {
  clearStudyDiscussionTopic,
  getStudyDiscussionTopic,
} from "../lib/study-discussion-draft";
import { CelestialAvatar } from "../components/MemberAvatar";
import { avatarVariant } from "../lib/avatar";

// "Your people": discussions anyone can start and join, and 1:1 chats with
// friends. Every link to discussions in the app leads here.
export default function Friends() {
  const { userId, moderator } = useCommunity();
  return (
    <FriendsScreen
      key={userId ?? "guest"}
      signedIn={!!userId}
      moderator={moderator}
    />
  );
}
function FriendsScreen({
  signedIn,
  moderator,
}: {
  signedIn: boolean;
  moderator: boolean;
}) {
  const { profile } = useApp(),
    c = (key: string) => friendCopy(profile.language, key);
  const [links, setLinks] = useState<Friend[]>([]),
    [blocked, setBlocked] = useState<{ peer: string; name: string }[]>([]);
  const [name, setName] = useState(""),
    [discoverable, setDiscoverable] = useState(false),
    [hasName, setHasName] = useState(false);
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<{ peer: string; name: string }[] | null>(
      null,
    );
  const [active, setActive] = useState<Friend | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [older, setOlder] = useState(false);
  const [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [reports, setReports] = useState<
    { id: string; body: string; reason: string }[] | null
  >(null);
  // A verse's "Open a public discussion" and Bible study arrive with a verse
  // and/or compose=1; a link to one discussion arrives with its id.
  const params = useLocalSearchParams<{
    verse?: string;
    compose?: string;
    topic?: string;
    view?: string;
    from?: string;
    chat?: string;
  }>();
  const openedFromNotice = useRef("");
  const linkedVerse = params.verse ? discussionVerseId(params.verse) : null,
    reading = linkedVerse ? getReadingVerse(linkedVerse) : null;
  const [verse, setVerse] = useState(
    linkedVerse && reading
      ? { id: linkedVerse, reference: reading.reference }
      : null,
  );
  const [view, setView] = useState<"discussions" | "friends">(
      params.view === "friends" || params.view === "find"
        ? "friends"
        : "discussions",
    ),
    [topic, setTopic] = useState<string | null>(params.topic ?? null),
    [starting, setStarting] = useState(params.compose === "1"),
    [finding, setFinding] = useState(params.view === "find");
  const load = useCallback(async () => {
    const data = await friends("list");
    setLinks(data.links);
    setBlocked(data.blocked);
    setHasName(!!data.me);
    return data;
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (!signedIn) return;
      let alive = true;
      void friends("list")
        .then((data) => {
          if (!alive) return;
          setLinks(data.links);
          setBlocked(data.blocked);
          setHasName(!!data.me);
          setName(data.me?.name ?? "");
          setDiscoverable(data.me?.discoverable ?? false);
          const friend = data.links.find(
            (link: Friend) =>
              link.id === params.chat && link.status === "accepted",
          );
          if (friend && openedFromNotice.current !== friend.id) {
            openedFromNotice.current = friend.id;
            void friends("messages", { id: friend.id })
              .then((messages: Message[]) => {
                if (!alive) return;
                setMessages(messages);
                setOlder(messages.length === 50);
                setActive(friend);
                void markFriendMessagesRead(friend.id, messages).catch(
                  () => {},
                );
              })
              .catch(() => {
                if (alive)
                  setNotice("Could not complete this. Please try again.");
              });
          }
        })
        .catch(() => {
          if (alive) setNotice("Could not complete this. Please try again.");
        });
      // New requests and friends appear on their own; nothing to press. The
      // name and settings being edited are left alone.
      const quiet = () => {
        void friends("list")
          .then((data) => {
            if (!alive) return;
            setLinks(data.links);
            setBlocked(data.blocked);
            setHasName(!!data.me);
          })
          .catch(() => {});
        if (moderator)
          void friends("reports")
            .then((open) => {
              if (alive) setReports(open);
            })
            .catch(() => {});
      };
      if (moderator) quiet();
      const timer = setInterval(quiet, 20000);
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, [signedIn, moderator, params.chat]),
  );
  // Refresh only while this conversation screen is focused; preserve older history and the draft.
  useFocusEffect(
    useCallback(() => {
      if (!active) return;
      let alive = true;
      const timer = setInterval(() => {
        void friends("messages", { id: active.id })
          .then((latest: Message[]) => {
            if (!alive) return;
            setNotice((previous) =>
              previous === "Could not complete this. Please try again."
                ? ""
                : previous,
            );
            setMessages((previous) => {
              const combined = new Map(
                previous.map((message) => [message.id, message]),
              );
              latest.forEach((message) => combined.set(message.id, message));
              return [...combined.values()].sort(
                (a, b) =>
                  a.created_at.localeCompare(b.created_at) ||
                  a.id.localeCompare(b.id),
              );
            });
            void markFriendMessagesRead(active.id, latest).catch(() => {});
          })
          .catch(() => {
            if (alive) {
              setNotice("Could not complete this. Please try again.");
            }
          });
      }, 5000);
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, [active]),
  );
  async function run(action: () => Promise<void>) {
    if (busy) return false;
    setBusy(true);
    setNotice("");
    try {
      await action();
      return true;
    } catch {
      setNotice("Could not complete this. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function act(action: string, data: Record<string, unknown>) {
    await friends(action, data);
    await load();
  }
  async function open(friend: Friend) {
    const data = await friends("messages", { id: friend.id });
    setMessages(data);
    setOlder(data.length === 50);
    setActive(friend);
    void markFriendMessagesRead(friend.id, data).catch(() => {});
  }
  if (!signedIn)
    return (
      <Screen back>
        <Heading>{c("Your people")}</Heading>
        <Body>{c("Sign in to find friends and chat.")}</Body>
        <Button title={c("Sign in")} onPress={() => router.push("/sign-in")} />
      </Screen>
    );
  // Discussions use the same public name as friend search; choosing one here
  // never makes anyone findable.
  const saveName = (next: string) =>
    run(async () => {
      await act("directory", { name: next, discoverable });
      setName(next);
    });
  if (starting)
    return (
      <StartDiscussion
        myName={hasName ? name : ""}
        onSaveName={saveName}
        initialTitle={getStudyDiscussionTopic()}
        verse={verse}
        onBack={() => setStarting(false)}
        onDone={() => {
          clearStudyDiscussionTopic();
          setStarting(false);
          setView("discussions");
        }}
      />
    );
  if (topic)
    return (
      <DiscussionRoom
        topicId={topic}
        myName={hasName ? name : ""}
        onSaveName={saveName}
        onBack={() =>
          params.from === "discover" && router.canGoBack()
            ? router.back()
            : setTopic(null)
        }
      />
    );
  if (active)
    return (
      <ChatThread
        title={active.name}
        subtitle={c("Private · only the two of you")}
        rule={c(
          "Messages are shared with your friend. Reported messages can be reviewed by moderators.",
        )}
        backLabel={c("Back")}
        onBack={() => {
          setActive(null);
          setMessages([]);
          setNotice("");
        }}
        menuLabel={c("More")}
        menu={[
          {
            title: c("Remove friend"),
            onPress: () =>
              void run(async () => {
                await act("remove", { id: active.id });
                setActive(null);
              }),
          },
          {
            title: c("Block"),
            onPress: () =>
              void run(async () => {
                await act("block", { peer: active.peer });
                setActive(null);
              }),
          },
        ]}
        messages={messages}
        peerName={active.name}
        myName={name || undefined}
        locale={profile.language}
        empty={c("No messages yet. Be the first to say hello.")}
        olderLabel={c("Older messages")}
        onOlder={
          older && messages[0]
            ? () =>
                void run(async () => {
                  const data = await friends("messages", {
                    id: active.id,
                    before: messages[0].created_at,
                    beforeId: messages[0].id,
                  });
                  setMessages([...data, ...messages]);
                  setOlder(data.length === 50);
                })
            : undefined
        }
        actionsHint={c("Report")}
        renderActions={(message, close) => (
          <ReportMessage
            busy={busy}
            c={c}
            onCancel={close}
            onReport={(reason) =>
              void run(async () => {
                await friends("report", {
                  id: active.id,
                  message: message.id,
                  reason,
                });
                close();
              }).then((ok) => ok && setNotice("Report sent"))
            }
          />
        )}
        notice={notice ? c(notice) : ""}
        placeholder={c("Write a message")}
        sendLabel={c("Send")}
        maxLength={2000}
        busy={busy}
        onSend={(text) =>
          run(async () => {
            await friends("send", { id: active.id, body: text });
            const data = await friends("messages", { id: active.id });
            setMessages((previous) => {
              const combined = new Map(
                previous.map((message) => [message.id, message]),
              );
              data.forEach((message: Message) =>
                combined.set(message.id, message),
              );
              return [...combined.values()].sort(
                (a, b) =>
                  a.created_at.localeCompare(b.created_at) ||
                  a.id.localeCompare(b.id),
              );
            });
            void markFriendMessagesRead(active.id, data).catch(() => {});
          })
        }
      />
    );
  const pending = links.filter((l) => l.status === "pending"),
    accepted = links.filter((l) => l.status === "accepted");
  return (
    <Screen back>
      <View style={{ gap: 6 }}>
        <Heading>{c("Your people")}</Heading>
        <Text style={s.lede}>
          {c("Talk any day of the week, not only at gatherings.")}
        </Text>
      </View>
      <View accessibilityRole="tablist" style={s.tabs}>
        {(
          [
            ["discussions", "Discussions"],
            ["friends", "Friends"],
          ] as const
        ).map(([id, title]) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === id }}
            onPress={() => {
              setNotice("");
              setView(id);
            }}
            style={[s.tab, view === id && s.tabOn]}
          >
            <Text style={[s.tabText, view === id && { color: colors.ink }]}>
              {c(title)}
            </Text>
          </Pressable>
        ))}
      </View>
      {view === "discussions" ? (
        <Discussions
          initialFilter={params.view === "mine" ? "mine" : "all"}
          verse={verse}
          onClearVerse={() => setVerse(null)}
          onOpen={setTopic}
          onStart={() => setStarting(true)}
        />
      ) : (
        <>
          <Text style={s.intro}>
            {c(
              "Private messages with people you have met. Only the two of you can read them.",
            )}
          </Text>
          <Notice text={notice ? c(notice) : ""} />
          {pending.map((l) => (
            <Card key={l.id}>
              <Body>{l.name}</Body>
              <Body small>{c(l.outgoing ? "Request sent" : "Requests")}</Body>
              <View style={s.actions}>
                {!l.outgoing && (
                  <TextAction
                    title={c("Accept")}
                    disabled={busy}
                    onPress={() => void run(() => act("accept", { id: l.id }))}
                  />
                )}
                <TextAction
                  title={c(l.outgoing ? "Cancel request" : "Decline")}
                  disabled={busy}
                  onPress={() => void run(() => act("decline", { id: l.id }))}
                />
                <TextAction
                  title={c("Block")}
                  disabled={busy}
                  onPress={() => void run(() => act("block", { peer: l.peer }))}
                />
              </View>
            </Card>
          ))}
          {accepted.length ? (
            <View style={s.list}>
              {accepted.map((l, i) => (
                <Pressable
                  key={l.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${c("Chat")}: ${l.name}`}
                  disabled={busy}
                  onPress={() => void run(() => open(l))}
                  style={({ pressed }) => [
                    s.row,
                    i < accepted.length - 1 && s.rowLine,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <CelestialAvatar variant={avatarVariant(l.peer)} size={40} />
                  <Text numberOfLines={1} style={s.rowName}>
                    {l.name}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>
              ))}
            </View>
          ) : (
            <Body>
              {c("No friends yet. Search for someone to connect with.")}
            </Body>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: finding }}
            onPress={() => setFinding(!finding)}
            style={({ pressed }) => [s.find, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.findText}>{c("Find friends")}</Text>
          </Pressable>
          {finding && (
            <>
              <Disclosure title={c("Friend search settings")}>
                <Body small>
                  {c(
                    "Only your chosen name appears in search. Your email stays private.",
                  )}
                </Body>
                <Field
                  label={c("Your public name")}
                  value={name}
                  onChangeText={setName}
                  maxLength={40}
                />
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: discoverable }}
                  onPress={() => setDiscoverable(!discoverable)}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Body>
                    {discoverable ? "☑ " : "☐ "}
                    {c("Let members find me by this name")}
                  </Body>
                </Pressable>
                <Button
                  title={c("Save")}
                  disabled={busy || name.trim().length < 2}
                  onPress={() =>
                    void run(async () => {
                      await act("directory", { name, discoverable });
                    }).then((ok) => ok && setNotice("Saved"))
                  }
                />
              </Disclosure>
              {!hasName && (
                <Body small>
                  {c(
                    "Choose and save a public name before requesting friends.",
                  )}
                </Body>
              )}
              <Field
                label={c("Find friends")}
                placeholder={c("Search by public name")}
                value={query}
                onChangeText={setQuery}
                maxLength={60}
              />
              <TextAction
                icon="search"
                title={c("Search")}
                disabled={busy || query.trim().length < 2}
                onPress={() =>
                  void run(async () =>
                    setResults(await friends("search", { query })),
                  )
                }
              />
              {results?.length === 0 && <Body>{c("No members found.")}</Body>}
              {results?.map((p) => {
                const existing = links.find((l) => l.peer === p.peer);
                return (
                  <Card key={p.peer}>
                    <Body>{p.name}</Body>
                    {existing ? (
                      <Body small>
                        {c(
                          existing.status === "accepted"
                            ? "Friends"
                            : existing.outgoing
                              ? "Request sent"
                              : "Requests",
                        )}
                      </Body>
                    ) : (
                      <TextAction
                        icon="person-add-outline"
                        title={c("Add friend")}
                        disabled={busy || !hasName}
                        onPress={() =>
                          void run(async () => {
                            await act("request", { peer: p.peer });
                          }).then((ok) => ok && setNotice("Request sent"))
                        }
                      />
                    )}
                  </Card>
                );
              })}
            </>
          )}
          <Text style={s.note}>
            {c(
              "People appear here only if they chose to be findable, and both of you said yes.",
            )}
          </Text>
          {!!blocked.length && (
            <Disclosure title={c("Blocked members")}>
              {blocked.map((p) => (
                <TextAction
                  key={p.peer}
                  title={`${c("Unblock")} · ${p.name}`}
                  disabled={busy}
                  onPress={() =>
                    void run(() => act("unblock", { peer: p.peer }))
                  }
                />
              ))}
            </Disclosure>
          )}
          {moderator && (
            <Disclosure title={c("Chat reports")}>
              {reports?.map((r) => (
                <Card key={r.id}>
                  <Body>{r.body}</Body>
                  <Body small>{r.reason}</Body>
                  <Button
                    title={c("Resolve")}
                    onPress={() =>
                      void run(async () => {
                        await friends("resolve_report", { id: r.id });
                        setReports(await friends("reports"));
                      })
                    }
                  />
                </Card>
              ))}
            </Disclosure>
          )}
        </>
      )}
    </Screen>
  );
}

// Reporting one message from a friend, with a short reason.
function ReportMessage({
  busy,
  c,
  onReport,
  onCancel,
}: {
  busy: boolean;
  c: (key: string) => string;
  onReport: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
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
}

const s = StyleSheet.create({
  lede: { fontSize: 15, lineHeight: 22, color: colors.muted },
  tabs: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: 24,
    backgroundColor: "#F1EBDD",
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  tabOn: {
    backgroundColor: colors.white,
    boxShadow: "0px 2px 8px rgba(48,44,40,0.12)",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.muted,
    textAlign: "center",
  },
  intro: { fontSize: 14, lineHeight: 20, color: colors.muted },
  actions: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  list: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 16,
    boxShadow:
      "0px 1px 2px rgba(48,44,40,0.05), 0px 8px 22px rgba(48,44,40,0.06)",
  },
  row: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: "#EDE6D8" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: colors.ink },
  rowName: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.ink },
  find: {
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.gold,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  findText: { fontSize: 15, fontWeight: "600", color: colors.ink },
  note: { fontSize: 13, lineHeight: 19, color: colors.muted },
});
