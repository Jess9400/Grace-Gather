import SharedNoteThread from "./SharedNoteThread";
import { Ionicons } from "@expo/vector-icons";
import { StudyAction as Button, StudyHeader } from "./StudyControls";
import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Modal,
  View,
  ScrollView,
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Body, colors } from "./quiet-ui";
import type { Language } from "../lib/content";
import { useCommunity } from "../lib/discussion-state";
import { friends, type Friend } from "../lib/friends";
import {
  studyNotebook,
  type PlanInvite,
  type SharedStudyNote,
  type StudyNote,
} from "../lib/study-notebook";
import copy from "../lib/study-workspace-copy.json";
import proCopy from "../lib/pro-study-preview.json";
export default function ReadingTogether(props: {
  language: Language;
  plan: number | null;
  initialInvitation?: string;
  onClose: () => void;
  onReadPlan: (plan: number) => void;
}) {
  const { userId } = useCommunity();
  return <Together key={userId} {...props} />;
}
function Together({
  language,
  plan,
  initialInvitation,
  onClose,
  onReadPlan,
}: {
  language: Language;
  plan: number | null;
  initialInvitation?: string;
  onClose: () => void;
  onReadPlan: (plan: number) => void;
}) {
  const c = copy[language];
  const p = proCopy[language];
  const [invites, setInvites] = useState<PlanInvite[]>([]);
  const [peers, setPeers] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<PlanInvite | null>(null);
  const [notes, setNotes] = useState<SharedStudyNote[]>([]);
  const [privateNotes, setPrivateNotes] = useState<StudyNote[] | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [more, setMore] = useState(false);
  const load = useCallback(async () => {
    const rows = await studyNotebook<PlanInvite[]>("invitations");
    setInvites(rows);
    const f = await friends("list");
    setPeers(
      (f.links as Friend[]).filter((friend) => friend.status === "accepted"),
    );
  }, []);
  const run = useCallback(async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError(false);
    try {
      await task();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.all([
      studyNotebook<PlanInvite[]>("invitations"),
      friends("list"),
    ])
      .then(([rows, f]) => {
        if (active) {
          setInvites(rows);
          const invited = rows.find(
            (row) => row.id === initialInvitation && row.status === "accepted",
          );
          if (invited) {
            setSelected(invited);
            void studyNotebook<SharedStudyNote[]>("shared", {
              invitation: invited.id,
            })
              .then(setNotes)
              .catch(() => setError(true));
          }
          setPeers(
            (f.links as Friend[]).filter(
              (friend) => friend.status === "accepted",
            ),
          );
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [initialInvitation]);
  useEffect(() => {
    let active = true;
    const timer = setInterval(() => {
      if (AppState.currentState !== "active" || busy) return;
      void studyNotebook<PlanInvite[]>("invitations")
        .then((rows) => {
          if (active) {
            setInvites(rows);
            if (
              selected &&
              !rows.some(
                (row) => row.id === selected.id && row.status === "accepted",
              )
            ) {
              setSelected(null);
              setNotes([]);
            }
          }
        })
        .catch(() => {});
      if (selected)
        void studyNotebook<SharedStudyNote[]>("shared", {
          invitation: selected.id,
        })
          .then((rows) => {
            if (active) {
              setNotes(rows);
              setMore(rows.length === 50);
            }
          })
          .catch(() => {});
    }, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selected, busy]);
  const availablePeers =
    plan === null
      ? []
      : peers.filter(
          (peer) =>
            !invites.some(
              (invite) => invite.plan === plan && invite.peer === peer.peer,
            ),
        );
  async function open(invite: PlanInvite, offset = 0) {
    const rows = await studyNotebook<SharedStudyNote[]>("shared", {
      invitation: invite.id,
      offset,
    });
    setSelected(invite);
    setNotes((old) => (offset ? [...old, ...rows] : rows));
    setMore(rows.length === 50);
    setPrivateNotes(null);
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.shade}>
        <View style={s.sheet}>
          <ScrollView contentContainerStyle={s.content}>
            <StudyHeader
              title={c.readingTogether}
              closeLabel={p.close}
              onClose={onClose}
            />
            {selected ? (
              <>
                <Button
                  secondary
                  title={c.back}
                  onPress={() => {
                    setSelected(null);
                    setPrivateNotes(null);
                  }}
                />
                <Text style={s.title}>
                  {p.planTitles[selected.plan]} · {selected.name}
                </Text>
                <Body small>{c.shareNotice}</Body>
                <Button
                  title={p.continue}
                  onPress={() => onReadPlan(selected.plan)}
                />
                <Text style={s.title}>{c.sharedNotes}</Text>
                {notes.map((note) => (
                  <View key={note.id} style={s.note}>
                    <Text style={s.gold}>
                      {note.reference} · {note.name}
                    </Text>
                    <Body>{note.body}</Body>
                    <SharedNoteThread
                      note={note}
                      invitation={selected.id}
                      language={language}
                      onPublic={onClose}
                    />
                    {note.mine && (
                      <Button
                        secondary
                        title={c.unshare}
                        disabled={busy}
                        onPress={() =>
                          void run(async () => {
                            await studyNotebook("unshare", {
                              invitation: selected.id,
                              note: note.id,
                            });
                            await open(selected);
                          })
                        }
                      />
                    )}
                  </View>
                ))}
                {!notes.length && !busy && <Body>{c.emptyShared}</Body>}
                {more && (
                  <Button
                    secondary
                    title={c.more}
                    disabled={busy}
                    onPress={() => void run(() => open(selected, notes.length))}
                  />
                )}
                <Button
                  secondary
                  title={c.share}
                  disabled={busy}
                  onPress={() =>
                    void run(async () =>
                      setPrivateNotes(
                        await studyNotebook<StudyNote[]>("notes"),
                      ),
                    )
                  }
                />
                {privateNotes?.map((note) => (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    key={note.id ?? note.verse}
                    style={s.note}
                    onPress={() =>
                      void run(async () => {
                        await studyNotebook("share", {
                          invitation: selected.id,
                          verse: note.verse,
                          kind: note.kind,
                          context: note.context_id,
                        });
                        await open(selected);
                      })
                    }
                  >
                    <Text style={s.gold}>{note.reference}</Text>
                    <Text style={s.text} numberOfLines={2}>
                      {note.body}
                    </Text>
                    <Text style={s.gold}>{c.share} →</Text>
                  </Pressable>
                ))}
                {privateNotes?.length === 0 && <Body>{c.emptyNotes}</Body>}

                <Button
                  secondary
                  title={c.leave}
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await studyNotebook("leave", { invitation: selected.id });
                      setSelected(null);
                      await load();
                    })
                  }
                />
              </>
            ) : (
              <>
                <Body small>{c.consent}</Body>
                {invites
                  .filter((invite) => plan === null || invite.plan === plan)
                  .map((invite) => (
                    <View key={invite.id} style={s.note}>
                      <View style={s.person}>
                        <View style={s.personIcon}>
                          <Ionicons
                            name="person-outline"
                            size={22}
                            color={colors.goldInk}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={s.title}>{invite.name}</Text>
                          <Text style={s.gold}>
                            {p.planTitles[invite.plan]}
                          </Text>
                        </View>
                      </View>
                      {invite.status === "accepted" ? (
                        <Button
                          secondary
                          title={c.sharedNotes}
                          disabled={busy}
                          onPress={() => void run(() => open(invite))}
                        />
                      ) : invite.outgoing ? (
                        <>
                          <View style={s.pending}>
                            <Body small>{c.pending}</Body>
                            <Button
                              secondary
                              title={c.cancelInvite}
                              disabled={busy}
                              onPress={() =>
                                void run(async () => {
                                  await studyNotebook("leave", {
                                    invitation: invite.id,
                                  });
                                  await load();
                                })
                              }
                            />
                          </View>
                        </>
                      ) : (
                        <>
                          <Button
                            title={c.accept}
                            disabled={busy}
                            onPress={() =>
                              void run(async () => {
                                await studyNotebook("respond", {
                                  invitation: invite.id,
                                  response: "accepted",
                                });
                                await load();
                                await open({ ...invite, status: "accepted" });
                              })
                            }
                          />
                          <Button
                            secondary
                            title={c.decline}
                            disabled={busy}
                            onPress={() =>
                              void run(async () => {
                                await studyNotebook("respond", {
                                  invitation: invite.id,
                                  response: "declined",
                                });
                                await load();
                              })
                            }
                          />
                        </>
                      )}
                    </View>
                  ))}
                {plan !== null && availablePeers.length > 0 && (
                  <>
                    <Text style={s.title}>{c.invite}</Text>
                    {availablePeers.map((peer) => (
                      <View key={peer.id} style={s.person}>
                        <View style={s.personIcon}>
                          <Ionicons
                            name="person-outline"
                            size={21}
                            color={colors.goldInk}
                          />
                        </View>
                        <Text style={[s.title, { flex: 1 }]}>{peer.name}</Text>
                        <Button
                          secondary
                          icon="paper-plane-outline"
                          title={c.inviteAction}
                          disabled={busy}
                          onPress={() =>
                            void run(async () => {
                              await studyNotebook("invite", {
                                peer: peer.peer,
                                plan,
                                initialInvitation,
                              });
                              await load();
                            })
                          }
                        />
                      </View>
                    ))}
                  </>
                )}
                {plan !== null && !busy && peers.length === 0 && (
                  <Body small>{c.friendsEmpty}</Body>
                )}
              </>
            )}
            {busy && <ActivityIndicator color={colors.goldInk} />}{" "}
            {error && <Body>{c.loadError}</Body>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  shade: {
    flex: 1,
    padding: 18,
    justifyContent: "center",
    backgroundColor: "#0009",
  },
  sheet: {
    maxHeight: "90%",
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    backgroundColor: colors.paper,
    borderRadius: 24,
  },
  content: { padding: 22, gap: 16 },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  personIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pale,
    alignItems: "center",
    justifyContent: "center",
  },
  pending: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  title: { color: colors.ink, fontSize: 19, fontWeight: "600" },
  note: {
    padding: 17,
    borderBottomWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  text: { color: colors.ink, fontSize: 16, lineHeight: 25 },
  gold: { color: colors.goldInk, fontSize: 14 },
});
