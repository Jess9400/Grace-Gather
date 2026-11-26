import { useCallback, useEffect, useState } from "react";
import { View, Pressable, Text } from "react-native";
import { Body, colors } from "./quiet-ui";
import { StudyAction } from "./StudyControls";
import SharedNoteThread from "./SharedNoteThread";
import {
  studyNotebook,
  type PlanInvite,
  type SharedStudyNote,
} from "../lib/study-notebook";
import { collaborationCopy } from "../lib/study-collaboration-copy";
import type { Language } from "../lib/content";
export default function PlanSharedNotes({
  plan,
  verse,
  reference,
  language,
  onPublic,
  onManage,
}: {
  plan: number;
  verse: string;
  reference: string;
  language: Language;
  onPublic?: () => void;
  onManage?: () => void;
}) {
  const c = collaborationCopy(language);
  const [invites, setInvites] = useState<PlanInvite[]>([]),
    [notes, setNotes] = useState<(SharedStudyNote & { invitation: string })[]>(
      [],
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [saved, setSaved] = useState(false),
    [expanded, setExpanded] = useState(false);
  const load = useCallback(async () => {
    const accepted = (await studyNotebook<PlanInvite[]>("invitations")).filter(
      (i) => i.plan === plan && i.status === "accepted",
    );
    const shared = await Promise.all(
      accepted.map(async (i) =>
        (
          await studyNotebook<SharedStudyNote[]>("shared", { invitation: i.id })
        ).map((n) => ({ ...n, invitation: i.id })),
      ),
    );
    setInvites(accepted);
    setNotes(shared.flat());
  }, [plan]);
  useEffect(() => {
    void Promise.resolve()
      .then(() => load())
      .catch(() => setError(true));
  }, [load]);
  async function share(invite: PlanInvite) {
    if (busy) return;
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      await studyNotebook("share", {
        invitation: invite.id,
        kind: "plan",
        context: String(plan),
        verse,
      });
      await load();
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 14 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(!expanded)}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: colors.goldInk, fontWeight: "600" }}>
          {c.shared}
          {notes.length ? ` · ${notes.length}` : ""}
        </Text>
        <Text style={{ color: colors.muted }}>{expanded ? "⌃" : "⌄"}</Text>
      </Pressable>
      {expanded && (
        <>
          {onManage && (
            <StudyAction secondary title={c.invitation} onPress={onManage} />
          )}
          <Body small>
            {reference} · {c.private}
          </Body>
          {!notes.length && <Body small>{c.noShared}</Body>}
          {invites.map((i) => (
            <StudyAction
              key={i.id}
              secondary
              title={`${c.share} · ${i.name}`}
              loading={busy}
              onPress={() => void share(i)}
            />
          ))}
          {saved && <Body small>{c.saved}</Body>}
          {error && <Body small>{c.error}</Body>}
          {notes.map((n) => (
            <View key={n.id} style={{ gap: 10, paddingVertical: 14 }}>
              <Body small>
                {n.reference} · {n.name}
              </Body>
              <Body>{n.body}</Body>
              <SharedNoteThread
                note={n}
                invitation={n.invitation}
                language={language}
                onPublic={onPublic}
              />
            </View>
          ))}
        </>
      )}
    </View>
  );
}
