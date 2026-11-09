import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { View, Pressable } from "react-native";
import {
  Screen,
  Heading,
  Body,
  Field,
  Button,
  Card,
  Notice,
} from "../components/quiet-ui";
import { TextAction, Disclosure } from "../components/CommunityControls";
import { useApp } from "../lib/state";
import { useCommunity } from "../lib/discussion-state";
import { friends, type Friend, type Message } from "../lib/friends";
import { friendCopy } from "../lib/friends-copy";
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
  const [body, setBody] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null),
    [reason, setReason] = useState("");
  const [reports, setReports] = useState<
    { id: string; body: string; reason: string }[] | null
  >(null);
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
        })
        .catch(() => {
          if (alive) setNotice("Could not complete this. Please try again.");
        });
      return () => {
        alive = false;
      };
    }, [signedIn]),
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
          })
          .catch(() => {
            if (alive) {
              setMessages([]);
              setNotice("Could not complete this. Please try again.");
            }
          });
      }, 10000);
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, [active]),
  );
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch {
      setNotice("Could not complete this. Please try again.");
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
    setBody("");
    setReport(null);
  }
  if (!signedIn)
    return (
      <Screen back>
        <Heading>{c("Friends & chats")}</Heading>
        <Body>{c("Sign in to find friends and chat.")}</Body>
        <Button title={c("Sign in")} onPress={() => router.push("/account")} />
      </Screen>
    );
  return (
    <Screen back>
      <Heading>{active ? active.name : c("Friends & chats")}</Heading>
      <Notice text={notice ? c(notice) : ""} />
      {active ? (
        <>
          <TextAction
            icon="chevron-back"
            title={c("Back")}
            disabled={busy}
            onPress={() => {
              setActive(null);
              setMessages([]);
              setBody("");
              setReport(null);
            }}
          />
          <Body small>{c("Private conversation")}</Body>
          <Body small>
            {c(
              "Messages are shared with your friend. Reported messages can be reviewed by moderators.",
            )}
          </Body>
          <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
            <TextAction
              title={c("Refresh")}
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const data = await friends("messages", { id: active.id });
                  setMessages(data);
                  setOlder(data.length === 50);
                })
              }
            />
            <TextAction
              title={c("Remove friend")}
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await act("remove", { id: active.id });
                  setActive(null);
                })
              }
            />
            <TextAction
              title={c("Block")}
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await act("block", { peer: active.peer });
                  setActive(null);
                })
              }
            />
          </View>
          {older && messages[0] && (
            <TextAction
              title={c("Older messages")}
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const data = await friends("messages", {
                    id: active.id,
                    before: messages[0].created_at,
                    beforeId: messages[0].id,
                  });
                  setMessages([...data, ...messages]);
                  setOlder(data.length === 50);
                })
              }
            />
          )}
          {messages.map((m) => (
            <Card key={m.id}>
              <Body>{m.body}</Body>
              <Body small>
                {m.mine ? name : active.name} ·{" "}
                {new Date(m.created_at).toLocaleString(profile.language)}
              </Body>
              {!m.mine && (
                <TextAction
                  title={c("Report")}
                  onPress={() => {
                    setReport(m.id);
                    setReason("");
                  }}
                />
              )}
            </Card>
          ))}
          {report && (
            <Card>
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
                    await friends("report", {
                      id: active.id,
                      message: report,
                      reason,
                    });
                    setReport(null);
                    setNotice("Report sent");
                  })
                }
              />
            </Card>
          )}
          <Field
            label={c("Write a message")}
            multiline
            value={body}
            onChangeText={setBody}
            maxLength={2000}
          />
          <Button
            title={c("Send")}
            disabled={busy || !body.trim()}
            onPress={() =>
              void run(async () => {
                await friends("send", { id: active.id, body });
                setBody("");
                const data = await friends("messages", { id: active.id });
                setMessages(data);
                setOlder(data.length === 50);
              })
            }
          />
        </>
      ) : (
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
                  setNotice("Saved");
                })
              }
            />
          </Disclosure>
          {!hasName && (
            <Body small>
              {c("Choose and save a public name before requesting friends.")}
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
                        setNotice("Request sent");
                      })
                    }
                  />
                )}
              </Card>
            );
          })}
          <TextAction
            title={c("Refresh")}
            disabled={busy}
            onPress={() =>
              void run(async () => {
                await load();
              })
            }
          />
          {links
            .filter((l) => l.status === "pending")
            .map((l) => (
              <Card key={l.id}>
                <Body>{l.name}</Body>
                <Body small>{c(l.outgoing ? "Request sent" : "Requests")}</Body>
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
              </Card>
            ))}
          {!links.some((l) => l.status === "accepted") && (
            <Body>
              {c("No friends yet. Search for someone to connect with.")}
            </Body>
          )}
          {links
            .filter((l) => l.status === "accepted")
            .map((l) => (
              <Card key={l.id}>
                <Body>{l.name}</Body>
                <TextAction
                  icon="chatbubble-outline"
                  title={c("Chat")}
                  disabled={busy}
                  onPress={() => void run(() => open(l))}
                />
              </Card>
            ))}
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
              <TextAction
                title={c("Refresh")}
                onPress={() =>
                  void run(async () => setReports(await friends("reports")))
                }
              />
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
