import { requireProAction } from "../lib/membership";
import { StudyAction as Button } from "./StudyControls";
import { useEffect, useState } from "react";
import { ActivityIndicator, TextInput, View, StyleSheet } from "react-native";
import { Body, LetterSurface, letter, serif } from "./quiet-ui";
import { useCommunity } from "../lib/discussion-state";
import type { Language } from "../lib/content";
import { studyNotebook, type StudyNote } from "../lib/study-notebook";
import copy from "../lib/study-workspace-copy.json";
export default function VerseNotes(props: {
  verse: string;
  reference: string;
  language: Language;
  kind?: "personal" | "plan" | "devotional";
  contextId?: string;
  onSaved?: () => void;
}) {
  const { userId } = useCommunity();
  return (
    <NoteEditor
      key={`${userId}:${props.kind}:${props.contextId}:${props.verse}`}
      {...props}
    />
  );
}
function NoteEditor({
  verse,
  reference,
  language,
  onSaved,
  kind = "personal",
  contextId = "",
}: {
  verse: string;
  reference: string;
  language: Language;
  kind?: "personal" | "plan" | "devotional";
  contextId?: string;
  onSaved?: () => void;
}) {
  const c = copy[language];
  const [body, setBody] = useState("");
  const [savedBody, setSavedBody] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    studyNotebook<StudyNote | null>("note", { verse, kind, context: contextId })
      .then((note) => {
        if (active) {
          setBody(note?.body ?? "");
          setSavedBody(note?.body ?? "");
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setError(c.loadError);
      });
    return () => {
      active = false;
    };
  }, [verse, kind, contextId, attempt, c.loadError]);
  async function save(remove = false) {
    if (!remove && !(await requireProAction(() => {}))) return;
    if (busy) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await studyNotebook(remove ? "delete" : "save", {
        verse,
        kind,
        context: contextId,
        reference,
        body,
      });
      setSavedBody(remove ? "" : body.trim());
      if (remove) setBody("");
      setSaved(true);
      onSaved?.();
    } catch {
      setError(c.saveError);
    } finally {
      setBusy(false);
    }
  }
  // A note is the reader's own writing, so it sits on the cream letter page.
  return (
    <LetterSurface>
      <View style={s.page}>
        <Body>{c.notes}</Body>
        <Body small>{c.privateNotice}</Body>
        {!ready && !error && <ActivityIndicator color={letter.gold} />}
        {ready && (
          <>
            <TextInput
              onFocus={() => { void requireProAction(() => {}); }}
              multiline
              editable={!busy}
              textAlignVertical="top"
              accessibilityLabel={c.notes}
              placeholder={c.placeholder}
              placeholderTextColor={letter.muted}
              value={body}
              onChangeText={(value) => {
                setBody(value);
                setSaved(false);
              }}
              maxLength={20000}
              style={s.input}
            />
            <Button
              title={c.save}
              disabled={!body.trim() || body.trim() === savedBody || busy}
              loading={busy}
              onPress={() => void save()}
            />
            {!!savedBody && (
              <Button
                secondary
                title={c.remove}
                disabled={busy}
                onPress={() => void save(true)}
              />
            )}
          </>
        )}
        {saved && <Body small>{c.saved}</Body>}
        {!!error && (
          <View>
            <Body small>{error}</Body>
            {!ready && (
              <Button
                secondary
                title={c.tryAgain}
                onPress={() => {
                  setError("");
                  setAttempt((n) => n + 1);
                }}
              />
            )}
          </View>
        )}
      </View>
    </LetterSurface>
  );
}
const s = StyleSheet.create({
  page: {
    gap: 12,
    padding: 20,
    borderRadius: 20,
    backgroundColor: letter.paper,
  },
  input: {
    minHeight: 120,
    maxHeight: 280,
    paddingVertical: 12,
    paddingHorizontal: 2,
    fontFamily: serif,
    fontSize: 19,
    lineHeight: 28,
    color: letter.ink,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: letter.line,
  },
});
