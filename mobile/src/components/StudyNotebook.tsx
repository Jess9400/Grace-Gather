import { Ionicons } from "@expo/vector-icons";
import { StudyAction as Button, StudyHeader } from "./StudyControls";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  Modal,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Body, colors } from "./quiet-ui";
import VerseNotes from "./VerseNotes";
import type { Language } from "../lib/content";
import { useCommunity } from "../lib/discussion-state";
import { studyNotebook, type StudyNote } from "../lib/study-notebook";
import copy from "../lib/study-workspace-copy.json";
import proCopy from "../lib/pro-study-preview.json";
export default function StudyNotebook({
  language,
  onClose,
  onOpenVerse,
}: {
  language: Language;
  onClose: () => void;
  onOpenVerse: (verse: string) => void;
}) {
  const { userId } = useCommunity();
  return (
    <Notebook
      key={userId}
      language={language}
      onClose={onClose}
      onOpenVerse={onOpenVerse}
    />
  );
}
function Notebook({
  language,
  onClose,
  onOpenVerse,
}: {
  language: Language;
  onClose: () => void;
  onOpenVerse: (verse: string) => void;
}) {
  const c = copy[language];
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<StudyNote[]>([]);
  const [selected, setSelected] = useState<StudyNote | null>(null);
  const [busy, setBusy] = useState(true);
  const sequence = useRef(0);
  const [error, setError] = useState(false);
  const [more, setMore] = useState(false);
  const load = useCallback(
    async (offset = 0) => {
      const ticket = ++sequence.current;
      setBusy(true);
      setError(false);
      try {
        const next = await studyNotebook<StudyNote[]>("notes", {
          search: query,
          offset,
        });
        if (ticket === sequence.current) {
          setRows((old) => (offset ? [...old, ...next] : next));
          setMore(next.length === 50);
        }
      } catch {
        if (ticket === sequence.current) setError(true);
      } finally {
        if (ticket === sequence.current) setBusy(false);
      }
    },
    [query, sequence],
  );
  useEffect(() => {
    const ticket = ++sequence.current;
    let active = true;
    studyNotebook<StudyNote[]>("notes", { search: query, offset: 0 })
      .then((next) => {
        if (active && ticket === sequence.current) {
          setRows(next);
          setMore(next.length === 50);
          setError(false);
        }
      })
      .catch(() => {
        if (active && ticket === sequence.current) setError(true);
      })
      .finally(() => {
        if (active && ticket === sequence.current) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [query, sequence]);
  const submitSearch = () => {
    const next = search.trim();
    if (next === query) void load();
    else {
      setBusy(true);
      setQuery(next);
    }
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.shade}>
        <View style={s.sheet}>
          <ScrollView
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
          >
            <StudyHeader
              title={c.myNotes}
              closeLabel={proCopy[language].close}
              onClose={onClose}
            />
            {selected ? (
              <>
                <Button
                  secondary
                  title={c.back}
                  onPress={() => setSelected(null)}
                />
                <Body>{selected.reference}</Body>
                <VerseNotes
                  verse={selected.verse}
                  reference={selected.reference}
                  language={language}
                  onSaved={() => void load()}
                />
                <Button
                  secondary
                  title={proCopy[language].readPassage}
                  onPress={() => onOpenVerse(selected.verse)}
                />
              </>
            ) : (
              <>
                <Body small>{c.noteSearchHint}</Body>
                <View style={s.searchBox}>
                  <Ionicons
                    name="search-outline"
                    size={19}
                    color={colors.muted}
                  />
                  <TextInput
                    accessibilityLabel={c.searchNotes}
                    placeholder={c.searchNotes}
                    placeholderTextColor={colors.muted}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={submitSearch}
                    returnKeyType="search"
                    style={s.input}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={c.search}
                    onPress={submitSearch}
                    style={s.searchAction}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={colors.goldInk} />
                    ) : (
                      <Ionicons
                        name="arrow-forward"
                        size={19}
                        color={colors.goldInk}
                      />
                    )}
                  </Pressable>
                </View>
                {rows.map((note) => (
                  <Pressable
                    accessibilityRole="button"
                    style={s.note}
                    key={note.verse}
                    onPress={() => setSelected(note)}
                  >
                    <Text style={s.reference}>{note.reference}</Text>
                    <Text style={s.text} numberOfLines={3}>
                      {note.body}
                    </Text>
                  </Pressable>
                ))}
                {!busy && !error && !rows.length && <Body>{c.emptyNotes}</Body>}
                {more && (
                  <Button
                    secondary
                    title={c.more}
                    disabled={busy}
                    onPress={() => void load(rows.length)}
                  />
                )}
              </>
            )}
            {busy && <ActivityIndicator color={colors.goldInk} />}{" "}
            {error && (
              <>
                <Body>{c.loadError}</Body>
                <Button
                  secondary
                  title={c.refresh}
                  onPress={() => void load()}
                />
              </>
            )}
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
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 14,
    backgroundColor: colors.white,
    borderRadius: 14,
  },
  searchAction: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 16,
  },
  note: { padding: 18, borderBottomWidth: 1, borderColor: colors.line, gap: 8 },
  reference: { color: colors.goldInk, fontSize: 15 },
  text: { color: colors.ink, fontSize: 17, lineHeight: 25 },
});
