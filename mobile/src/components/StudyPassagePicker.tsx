import { StudyAction as Button, StudyHeader } from "./StudyControls";
import { useState } from "react";
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  Text,
  TextInput,
  StyleSheet,
} from "react-native";
import { Body, colors } from "./quiet-ui";
import {
  collections,
  chapterRows,
  type CollectionId,
  type ReadingVerse,
} from "../lib/bible";
import type { Language } from "../lib/content";
import copy from "../lib/pro-study-preview.json";
import workspaceCopy from "../lib/study-workspace-copy.json";

export default function StudyPassagePicker({
  collection,
  curated,
  language,
  onSelect,
  onClose,
}: {
  collection: CollectionId | null;
  curated: ReadingVerse[];
  language: Language;
  onSelect: (verse: ReadingVerse) => void;
  onClose: () => void;
}) {
  const c = { ...copy[language], ...workspaceCopy[language] };
  const [book, setBook] = useState<number | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const index = collection ? collections[collection].index : null;
  const rows =
    book !== null && chapter !== null && collection
      ? chapterRows(book, chapter, collection)
      : curated;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.shade}>
        <View style={s.sheet}>
          <StudyHeader
            title={c.passage}
            closeLabel={c.close}
            onClose={onClose}
          />

          {(book !== null || chapter !== null) && (
            <Button
              secondary
              title={c.back}
              onPress={() =>
                chapter !== null ? setChapter(null) : setBook(null)
              }
            />
          )}
          {book === null && index && (
            <TextInput
              accessibilityLabel={c.searchBooks}
              placeholder={c.searchBooks}
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
              style={s.field}
            />
          )}
          <ScrollView
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
          >
            {book === null && index ? (
              index.books.map(
                (item, i) =>
                  item.name
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase()) && (
                    <Pressable
                      accessibilityRole="button"
                      key={item.code}
                      style={s.row}
                      onPress={() => {
                        setBook(i);
                        setSearch("");
                      }}
                    >
                      <Text style={s.text}>{item.name}</Text>
                      <Text style={s.gold}>›</Text>
                    </Pressable>
                  ),
              )
            ) : chapter === null && index && book !== null ? (
              <>
                <Body>
                  {index.books[book].name} · {c.chapter}
                </Body>
                <View style={s.grid}>
                  {Array.from(
                    { length: index.books[book].chapters },
                    (_, i) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${index.books[book].name} ${i + 1}`}
                        key={i}
                        onPress={() => setChapter(i + 1)}
                        style={s.number}
                      >
                        <Text style={s.text}>{i + 1}</Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </>
            ) : (
              <>
                {rows.map((verse) => (
                  <Pressable
                    accessibilityRole="button"
                    key={verse.id}
                    onPress={() => onSelect(verse)}
                    style={s.verse}
                  >
                    <Text style={s.gold}>{verse.reference}</Text>
                    <Text style={s.text}>{verse.text}</Text>
                  </Pressable>
                ))}
                {!rows.length && <Body>{c.unavailable}</Body>}
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
    padding: 20,
    gap: 12,
    flexShrink: 1,
  },
  header: { gap: 8 },
  content: { gap: 12, paddingBottom: 20 },
  field: {
    color: colors.ink,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  text: { color: colors.ink, fontSize: 17, lineHeight: 26 },
  gold: { color: colors.goldInk, fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  number: {
    width: 52,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  verse: {
    padding: 16,
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 14,
  },
});
