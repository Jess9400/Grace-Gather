import { useCallback, useEffect, useState } from "react";
import { View, TextInput } from "react-native";
import { router } from "expo-router";
import { Body, colors } from "./quiet-ui";
import { StudyAction } from "./StudyControls";
import {
  studyNotebook,
  type SharedStudyNote,
  type StudyComment,
} from "../lib/study-notebook";
import { collaborationCopy } from "../lib/study-collaboration-copy";
import {
  setStudyDiscussionTopic,
  setStudyDiscussionBody,
} from "../lib/study-discussion-draft";
import type { Language } from "../lib/content";
export default function SharedNoteThread({
  note,
  invitation,
  language,
  onPublic,
}: {
  note: SharedStudyNote;
  invitation: string;
  language: Language;
  onPublic?: () => void;
}) {
  const c = collaborationCopy(language);
  const [rows, setRows] = useState<StudyComment[]>([]),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [more, setMore] = useState(false),
    [publish, setPublish] = useState(false);
  const load = useCallback(
    async (offset = 0) => {
      const next = await studyNotebook<StudyComment[]>("comments", {
        invitation,
        note: note.id,
        offset,
      });
      setRows((old) => (offset ? [...old, ...next] : next));
      setMore(next.length === 50);
    },
    [invitation, note.id],
  );
  useEffect(() => {
    let live = true;
    async function refresh() {
      try {
        const next = await studyNotebook<StudyComment[]>("comments", {
          invitation,
          note: note.id,
        });
        if (live) {
          setRows(next);
          setMore(next.length === 50);
          setError(false);
        }
      } catch {
        if (live) setError(true);
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [invitation, note.id]);
  async function comment() {
    if (busy || !body.trim()) return;
    setBusy(true);
    setError(false);
    try {
      await studyNotebook("comment", { invitation, note: note.id, body });
      setBody("");
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View
      style={{
        gap: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderColor: colors.line,
      }}
    >
      <Body small>{c.comments}</Body>
      {rows.map((row) => (
        <View
          key={row.id}
          style={{
            paddingLeft: 12,
            borderLeftWidth: 1,
            borderColor: colors.line,
            gap: 5,
          }}
        >
          <Body small>{row.name}</Body>
          <Body>{row.body}</Body>
          {row.mine && (
            <StudyAction
              secondary
              title="×"
              disabled={busy}
              onPress={() => {
                setBusy(true);
                void studyNotebook("delete_comment", {
                  invitation,
                  note: note.id,
                  comment: row.id,
                })
                  .then(() => load())
                  .catch(() => setError(true))
                  .finally(() => setBusy(false));
              }}
            />
          )}
        </View>
      ))}
      {!rows.length && !error && <Body small>{c.empty}</Body>}
      {more && (
        <StudyAction
          secondary
          title="…"
          onPress={() => void load(rows.length).catch(() => setError(true))}
        />
      )}
      <TextInput
        multiline
        value={body}
        onChangeText={setBody}
        maxLength={4000}
        placeholder={c.comment}
        accessibilityLabel={c.comment}
        placeholderTextColor={colors.muted}
        editable={!busy}
        style={{
          color: colors.ink,
          padding: 12,
          minHeight: 65,
          maxHeight: 160,
          fontSize: 16,
          backgroundColor: colors.white,
          borderRadius: 12,
        }}
      />
      <StudyAction
        title={c.send}
        loading={busy}
        disabled={!body.trim() || busy}
        onPress={() => void comment()}
      />
      {error && <Body small>{c.error}</Body>}
      {note.mine && (
        <StudyAction
          secondary
          title={c.public}
          onPress={() => setPublish(!publish)}
        />
      )}
      {publish && (
        <>
          <Body small>{c.publicNotice}</Body>
          <StudyAction
            title={c.public}
            onPress={() => {
              setStudyDiscussionTopic(note.reference);
              setStudyDiscussionBody(note.body);
              onPublic?.();
              router.push({
                pathname: "/friends",
                params: {
                  view: "discussions",
                  compose: "1",
                  verse: note.verse,
                },
              });
            }}
          />
        </>
      )}
    </View>
  );
}
