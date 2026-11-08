import Study from "../study";
import { useInterfaceCopy } from "../../lib/use-interface-copy";
import { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Brand, Body, Button, colors, serif } from "../../components/quiet-ui";
import { useApp } from "../../lib/state";
import { q } from "../../lib/quiet-copy";
import { data } from "../../lib/content";
import {
  collections,
  ensureCollection,
  collectionFor,
  CollectionId,
  chapterRows,
  readReaderLocation,
  rememberReaderLocation,
  ReadingVerse,
  readingLocation,
} from "../../lib/bible";
export default function Bible() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  return view === "reader" ? <BibleReading /> : <Study embedded />;
}
function BibleReading() {
  const { profile } = useApp();
  const collection = collectionFor(profile);
  const tr = useInterfaceCopy();
  const [loaded, setLoaded] = useState<string | null>(null),
    [failedCollection, setFailed] = useState<string | null>(null),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (collection)
      void ensureCollection(collection)
        .then(() => {
          if (active) setLoaded(collection);
        })
        .catch(() => {
          if (active) setFailed(collection);
        });
    return () => {
      active = false;
    };
  }, [collection, attempt]);
  if (collection && loaded !== collection)
    return (
      <SafeAreaView style={s.safe}>
        <Brand />
        <Button
          secondary
          title={tr("Study resources")}
          onPress={() => router.setParams({ view: "study" })}
        />
        <Body>
          {tr(
            failedCollection === collection
              ? "Could not load this Bible. Please try again."
              : "Loading your Bible…",
          )}
        </Body>
        {failedCollection === collection && (
          <Button
            title={tr("Try again")}
            onPress={() => {
              setFailed(null);
              setAttempt((n) => n + 1);
            }}
          />
        )}
      </SafeAreaView>
    );
  return (
    <BibleReader key={collection ?? profile.edition} collection={collection} />
  );
}
function BibleReader({ collection }: { collection: CollectionId | null }) {
  const tr = useInterfaceCopy();
  const { profile } = useApp(),
    lang = profile.language,
    { height } = useWindowDimensions();
  const full = !!collection,
    bibleIndex = collections[collection ?? "web"].index,
    edition = data.editions.find((e) => e.id === profile.edition);
  const [position, setPosition] = useState(() =>
      readReaderLocation(collection ?? "web"),
    ),
    [rows, setRows] = useState(() =>
      chapterRows(
        readReaderLocation(collection ?? "web").book,
        readReaderLocation(collection ?? "web").chapter,
        collection ?? "web",
      ),
    ),
    [picker, setPicker] = useState(false),
    [pickingBook, setPickingBook] = useState<number | null>(null);
  const list = useRef<FlatList<ReadingVerse>>(null),
    cursor = useRef({ ...position });
  function append() {
    let { book, chapter } = cursor.current;
    chapter++;
    if (chapter > bibleIndex.books[book].chapters) {
      book++;
      chapter = 1;
    }
    if (book >= bibleIndex.books.length) return;
    cursor.current = { book, chapter };
    setRows((previous) => [
      ...previous,
      ...chapterRows(book, chapter, collection ?? "web"),
    ]);
  }
  function jump(book: number, chapter: number) {
    cursor.current = { book, chapter };
    rememberReaderLocation(book, chapter, collection ?? "web");
    setPosition({ book, chapter });
    setRows(chapterRows(book, chapter, collection ?? "web"));
    list.current?.scrollToOffset({ offset: 0, animated: false });
    setPicker(false);
    setPickingBook(null);
  }
  const curated: ReadingVerse[] = (edition?.passages ?? []).map((v) => ({
    ...v,
    notes: [],
    editionName: edition!.name,
    attribution: edition!.attribution,
    licenseUrl: edition!.licenseUrl,
  }));
  const viewability = useCallback(
    ({ viewableItems }: { viewableItems: { item: ReadingVerse }[] }) => {
      const first = viewableItems[0]?.item;
      if (!first) return;
      const location = readingLocation(first.id);
      if (!location) return;
      const book = bibleIndex.books.findIndex((b) => b.code === location.code);
      if (book >= 0) {
        rememberReaderLocation(book, location.chapter, collection ?? "web");
        setPosition({ book, chapter: location.chapter });
      }
    },
    [bibleIndex, collection],
  );
  if (!edition)
    return (
      <SafeAreaView style={s.safe}>
        <Brand />
        <Body>
          {tr(
            "No Bible is available for this language and tradition yet. Choose another edition explicitly; we will not substitute English.",
          )}
        </Body>
        <Button
          title={tr("Choose a supported edition")}
          onPress={() => router.push("/preferences")}
        />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <View style={s.header}>
        <Brand />
        <View style={s.location}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              full
                ? `${bibleIndex.books[position.book].name} ${position.chapter}`
                : q(lang, "selections")
            }
            disabled={!full}
            onPress={() => setPicker(true)}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Text style={s.locationText}>
              {full
                ? `${bibleIndex.books[position.book].name} ${position.chapter}  ⌄`
                : q(lang, "selections")}
            </Text>
          </Pressable>
          <Text style={s.edition}>
            {full
              ? collection === "web"
                ? "WEB"
                : collection === "dra"
                  ? "DRA"
                  : collection === "brenton"
                    ? "LXX + WEB NT"
                    : bibleIndex.edition
              : (edition?.name ?? tr("Unavailable"))}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Body small>{q(lang, "tap")}</Body>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/library")}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ fontSize: 12, color: colors.goldInk }}>
              {q(lang, "library")}
            </Text>
          </Pressable>
        </View>
        {!full && <Body small>{q(lang, "limited")}</Body>}
        {collection === "synodal" && (
          <Body small>
            {tr(
              "Synodal source: 66 books. Additional Orthodox books are not included in this publisher’s file.",
            )}
          </Body>
        )}
        <Text style={s.source}>
          {full ? bibleIndex.edition : edition?.scope}
        </Text>
      </View>
      <FlatList
        ref={list}
        data={full ? rows : curated}
        keyExtractor={(v) => v.id}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={5}
        onEndReached={full ? append : undefined}
        onEndReachedThreshold={0.8}
        onViewableItemsChanged={full ? viewability : undefined}
        viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.reference} ${item.text}`}
            onPress={() =>
              router.push({ pathname: "/verse/[id]", params: { id: item.id } })
            }
            style={[s.verse, { minHeight: Math.max(300, height * 0.57) }]}
          >
            <Text style={s.reference}>{item.reference}</Text>
            <Text style={s.scripture}>{item.text}</Text>
            {!item.text && item.notes.length > 0 && (
              <View style={{ gap: 10 }}>
                <Body small>{tr("Publisher note")}</Body>
                {item.notes.map((note, i) => (
                  <Body key={i}>{note}</Body>
                ))}
              </View>
            )}
            <Ionicons
              name="arrow-forward"
              size={21}
              color={colors.goldInk}
              style={{ alignSelf: "flex-end" }}
            />
          </Pressable>
        )}
        ListHeaderComponent={
          full && collection !== "web" ? (
            <View style={{ paddingVertical: 12 }}>
              <Body small>{tr(bibleIndex.coverageNote ?? "")}</Body>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={{ padding: 25, gap: 16 }}>
            <Body>{q(lang, "limited")}</Body>
            <Button
              title={tr("Account and settings")}
              onPress={() => router.push("/preferences")}
            />
          </View>
        }
      />
      <Modal
        visible={picker}
        animationType="slide"
        onRequestClose={() => setPicker(false)}
      >
        <SafeAreaView style={s.safe}>
          <ScrollView
            contentContainerStyle={{
              padding: 24,
              gap: 12,
              maxWidth: 620,
              width: "100%",
              alignSelf: "center",
            }}
          >
            <Button
              secondary
              title={q(lang, "close")}
              onPress={() => {
                setPicker(false);
                setPickingBook(null);
              }}
            />
            <Text style={s.locationText}>
              {q(lang, pickingBook === null ? "chooseBook" : "chooseChapter")}
            </Text>
            {pickingBook === null ? (
              bibleIndex.books.map((book, i) => (
                <Pressable
                  key={book.code}
                  accessibilityRole="button"
                  onPress={() => setPickingBook(i)}
                  style={s.book}
                >
                  <Text style={{ fontSize: 18, color: colors.ink }}>
                    {book.name}
                  </Text>
                </Pressable>
              ))
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {Array.from(
                  { length: bibleIndex.books[pickingBook].chapters },
                  (_, i) => (
                    <Pressable
                      key={i}
                      accessibilityRole="button"
                      accessibilityLabel={`${bibleIndex.books[pickingBook].name} ${i + 1}`}
                      onPress={() => jump(pickingBook, i + 1)}
                      style={s.chapter}
                    >
                      <Text style={{ fontSize: 18, color: colors.ink }}>
                        {i + 1}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 10,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  locationText: { fontFamily: serif, fontSize: 25, color: colors.ink },
  edition: { fontSize: 11, color: colors.muted, maxWidth: "45%" },
  source: { fontSize: 11, color: colors.muted, lineHeight: 17 },
  verse: {
    justifyContent: "center",
    gap: 28,
    paddingHorizontal: 12,
    paddingVertical: 50,
    borderBottomWidth: 1,
    borderColor: colors.line,
    maxWidth: 576,
    width: "100%",
    alignSelf: "center",
  },
  reference: { fontSize: 13, color: colors.goldInk },
  scripture: {
    fontFamily: serif,
    fontSize: 30,
    lineHeight: 47,
    color: colors.ink,
  },
  book: {
    padding: 15,
    borderBottomWidth: 1,
    borderColor: colors.line,
    minHeight: 50,
  },
  chapter: {
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    minWidth: 54,
    minHeight: 50,
    alignItems: "center",
  },
});
