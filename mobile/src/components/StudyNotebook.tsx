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
import SharedNoteThread from "./SharedNoteThread";
import { collaborationCopy } from "../lib/study-collaboration-copy";
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
type NotebookNote = StudyNote & {
  shared?: boolean;
  invitation?: string;
  mine?: boolean;
  name?: string;
  plan?: number;
};
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
  const labels = collaborationCopy(language);
  const [kind, setKind] = useState<"personal" | "plan" | "devotional">(
    "personal",
  );
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<NotebookNote[]>([]);
  const [selected, setSelected] = useState<NotebookNote | null>(null);
  const [busy, setBusy] = useState(true);
  const sequence = useRef(0);
  const pageOffset = useRef(0);
  const [error, setError] = useState(false);
  const [more, setMore] = useState(false);
  const load = useCallback(
    async (offset = 0) => {
      const ticket = ++sequence.current;
      setBusy(true);
      setError(false);
      try {
        const next = await studyNotebook<NotebookNote[]>("notes", {
          kind,
          search: query,
          offset,
        });
        if (ticket === sequence.current) {
          const shared =
            kind === "plan"
              ? await studyNotebook<NotebookNote[]>("shared_all", {
                  search: query,
                  offset,
                })
              : [];
          if (ticket !== sequence.current) return;
          pageOffset.current = offset;
          const batch = [
            ...next,
            ...shared.map((n) => ({ ...n, shared: true })),
          ];
          setRows((old) => (offset ? [...old, ...batch] : batch));
          setMore(next.length === 50 || shared.length === 50);
        }
      } catch {
        if (ticket === sequence.current) setError(true);
      } finally {
        if (ticket === sequence.current) setBusy(false);
      }
    },
    [query, kind, sequence],
  );
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => {
      if (live) return load();
    });
    return () => {
      live = false;
    };
  }, [load]);
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
                {selected.shared && selected.invitation ? (
                  <>
                    <Body small>{selected.name}</Body>
                    <Body>{selected.body}</Body>
                    <SharedNoteThread
                      note={
                        selected as import("../lib/study-notebook").SharedStudyNote
                      }
                      invitation={selected.invitation}
                      language={language}
                      onPublic={onClose}
                    />
                  </>
                ) : (
                  <VerseNotes
                    verse={selected.verse}
                    reference={selected.reference}
                    language={language}
                    kind={selected.kind}
                    contextId={selected.context_id}
                    onSaved={() => void load()}
                  />
                )}
                <Button
                  secondary
                  title={proCopy[language].readPassage}
                  onPress={() => onOpenVerse(selected.verse)}
                />
              </>
            ) : (
              <>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}
                >
                  {(["personal", "devotional", "plan"] as const).map(
                    (value) => (
                      <Pressable
                        key={value}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: kind === value }}
                        onPress={() => {
                          setKind(value);
                          setSelected(null);
                          setRows([]);
                          setBusy(true);
                        }}
                        style={{
                          paddingVertical: 10,
                          borderBottomWidth: kind === value ? 2 : 0,
                          borderColor: colors.gold,
                        }}
                      >
                        <Text
                          style={{
                            color: kind === value ? colors.ink : colors.muted,
                          }}
                        >
                          {labels[value]}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
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
                    key={`${note.shared ? "shared" : "own"}:${note.id ?? note.verse}`}
                    onPress={() => setSelected(note)}
                  >
                    <Text style={s.reference}>
                      {note.reference}
                      {note.kind === "plan" && note.context_id
                        ? ` · ${proCopy[language].planTitles[Number(note.context_id)]}`
                        : ""}
                      {note.shared ? ` · ${labels.shared} · ${note.name}` : ""}
                    </Text>
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
                    onPress={() => void load(pageOffset.current + 50)}
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
