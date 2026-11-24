import { StudyAction as Button } from "./StudyControls";
import { useEffect, useState } from "react";
import { ActivityIndicator, TextInput, View, StyleSheet } from "react-native";
import { Body, Card, colors } from "./quiet-ui";
import { useCommunity } from "../lib/discussion-state";
import type { Language } from "../lib/content";
import { studyNotebook, type StudyNote } from "../lib/study-notebook";
import copy from "../lib/study-workspace-copy.json";
export default function VerseNotes(props: {
  verse: string;
  reference: string;
  language: Language;
  onSaved?: () => void;
}) {
  const { userId } = useCommunity();
  return <NoteEditor key={`${userId}:${props.verse}`} {...props} />;
}
function NoteEditor({
  verse,
  reference,
  language,
  onSaved,
}: {
  verse: string;
  reference: string;
  language: Language;
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
    studyNotebook<StudyNote | null>("note", { verse })
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
  }, [verse, attempt, c.loadError]);
  async function save(remove = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await studyNotebook(remove ? "delete" : "save", {
        verse,
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
  return (
    <Card>
      <Body>{c.notes}</Body>
      <Body small>{c.privateNotice}</Body>
      {!ready && !error && <ActivityIndicator color={colors.goldInk} />}
      {ready && (
        <>
          <TextInput
            multiline
            editable={!busy}
            textAlignVertical="top"
            accessibilityLabel={c.notes}
            placeholder={c.placeholder}
            placeholderTextColor={colors.muted}
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
              title={c.search}
              onPress={() => {
                setError("");
                setAttempt((n) => n + 1);
              }}
            />
          )}
        </View>
      )}
    </Card>
  );
}
const s = StyleSheet.create({
  input: {
    minHeight: 110,
    maxHeight: 260,
    padding: 16,
    fontSize: 17,
    lineHeight: 26,
    color: colors.ink,
    backgroundColor: colors.pale,
    borderRadius: 15,
  },
});
