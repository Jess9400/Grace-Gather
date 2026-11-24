import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Heading,
  Body,
  Card,
  Button,
  colors,
  serif,
} from "../components/quiet-ui";
import StepBibleSearch from "../components/StepBibleSearch";
import { useApp } from "../lib/state";
import * as storage from "../lib/storage";
import {
  readingPlans,
  planPassage,
  normalizePlanProgress,
  type PlanProgress,
  type PlanPassage,
} from "../lib/reading-plans";
import {
  collections,
  ensureCollection,
  studyCollectionFor,
  chapterRows,
  getReadingVerse,
  type ReadingVerse,
} from "../lib/bible";
import { fromVerseRoute, toVerseRoute } from "../lib/verse-route";
import copy from "../lib/pro-study-preview.json";

const icons = [
  "book-outline",
  "musical-notes-outline",
  "sunny-outline",
  "footsteps-outline",
  "leaf-outline",
  "heart-outline",
] as const;
const devotionalPassages: PlanPassage[] = [
  { book: "ROM", chapter: 15, from: 13, to: 13 },
  { book: "MAT", chapter: 11, from: 28, to: 28 },
  { book: "PSA", chapter: 107, from: 1, to: 1 },
  { book: "JAS", chapter: 1, from: 5, to: 5 },
  { book: "JAS", chapter: 1, from: 19, to: 19 },
  { book: "ZEC", chapter: 4, from: 10, to: 10 },
  { book: "PHP", chapter: 4, from: 6, to: 7 },
];
export default function StudyWorkspace() {
  const { profile } = useApp();
  const params = useLocalSearchParams<{ verse?: string; tab?: string }>();
  const verseId = params.verse ? fromVerseRoute(params.verse) : null;
  const c = copy[profile.language];
  const collection = studyCollectionFor(profile);
  const [tab, setTab] = useState(params.tab === "2" ? 2 : 0);
  const [progress, setProgress] = useState<PlanProgress>(
    normalizePlanProgress(null),
  );
  const [owner, setOwner] = useState<string | null>(null);
  const [progressAttempt, setProgressAttempt] = useState(0);
  const [progressReady, setProgressReady] = useState(false);
  const [progressError, setProgressError] = useState(false);
  const [saving, setSaving] = useState(false);
  const writeLock = useRef(false);
  const [detail, setDetail] = useState<number | null>(null);
  const [devotional, setDevotional] = useState(false);
  const [devotionalPlanMode, setDevotionalPlanMode] = useState(false);
  const [words, setWords] = useState(false);
  const [reading, setReading] = useState<ReadingVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [readError, setReadError] = useState(false);
  const readSequence = useRef(0);
  const invalidateReadings = useCallback(() => {
    readSequence.current++;
  }, []);
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const timer = setTimeout(
      () => setDate(new Date()),
      Math.max(1000, midnight.getTime() - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [date]);
  const dailyIndex =
    Math.floor(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
    ) % 7;
  const devotionalIndex = devotionalPlanMode
    ? Math.min(progress.devotionalDay ?? 0, 6)
    : dailyIndex;
  const daily = c.devotionals[devotionalIndex];
  useEffect(() => {
    let active = true;
    storage
      .getItem("profile-owner")
      .then(async (id) => {
        const value = id ? await storage.getItem(`study-plans:${id}`) : null;
        if (active) {
          setOwner(id);
          setProgress(normalizePlanProgress(value ? JSON.parse(value) : null));
          setProgressReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setProgressError(true);
          setProgressReady(true);
        }
      });
    return () => {
      active = false;
      invalidateReadings();
    };
  }, [progressAttempt, invalidateReadings]);
  const saveProgress = async (next: PlanProgress) => {
    if (!owner || writeLock.current) return false;
    writeLock.current = true;
    setSaving(true);
    setProgressError(false);
    try {
      await storage.setItem(`study-plans:${owner}`, JSON.stringify(next));
      setProgress(next);
      return true;
    } catch {
      setProgressError(true);
      return false;
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  };
  const loadReading = async (passage: PlanPassage) => {
    const ticket = ++readSequence.current;
    setReading([]);
    setLoading(true);
    setReadError(false);
    try {
      if (!collection) throw Error("No collection");
      await ensureCollection(collection);
      const book = collections[collection].index.books.findIndex(
        (b) => b.code === passage.book,
      );
      const rows = chapterRows(book, passage.chapter, collection).filter(
        (v) =>
          (!passage.from || Number(v.id.split(".").pop()) >= passage.from) &&
          (!passage.to || Number(v.id.split(".").pop()) <= passage.to),
      );
      if (ticket === readSequence.current) {
        setReading(rows);
        setReadError(rows.length === 0);
      }
    } catch {
      if (ticket === readSequence.current) setReadError(true);
    } finally {
      if (ticket === readSequence.current) setLoading(false);
    }
  };
  const openPlan = (index: number) => {
    setWords(false);
    setDevotional(false);
    setDetail(index);
    const passage = planPassage(
      index,
      Math.min(progress.days[index] ?? 0, readingPlans[index].length - 1),
      collection ?? "",
    );
    if (passage) void loadReading(passage);
  };
  const openDevotional = (asPlan = false) => {
    setDevotionalPlanMode(asPlan);
    setWords(false);
    setDetail(null);
    setDevotional(true);
    const index = asPlan
      ? Math.min(progress.devotionalDay ?? 0, 6)
      : dailyIndex;
    const passage = { ...devotionalPassages[index] };
    if (
      passage.book === "PSA" &&
      ["dra", "brenton", "synodal"].includes(collection ?? "")
    )
      passage.chapter = 106;
    void loadReading(passage);
  };
  const close = () => {
    readSequence.current++;
    setDetail(null);
    setDevotional(false);
    setWords(false);
    setReading([]);
  };
  const openContext = async (panel: "deeper" | "sources" | "theology") => {
    let selected = verseId;
    if (!selected && collection) {
      setLoading(true);
      setReadError(false);
      try {
        await ensureCollection(collection);
        const index = collections[collection].index.books.findIndex(
          (book) => book.code === "GEN",
        );
        selected = chapterRows(index, 1, collection)[0]?.id ?? null;
      } catch {
        setReadError(true);
      } finally {
        setLoading(false);
      }
    }
    if (selected)
      router.push({
        pathname: "/verse/[id]",
        params: { id: toVerseRoute(selected), panel },
      });
    else router.push("/(tabs)/bible");
  };
  return (
    <Screen back home place="bible">
      <View style={s.row}>
        <Heading>{c.study}</Heading>
        <Text style={s.gold}>✧ PRO</Text>
      </View>
      <Body>{c.intro}</Body>
      <View style={s.tabs}>
        {[c.today, c.plans, c.words].map((title, index) => (
          <Pressable
            key={title}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === index }}
            onPress={() => setTab(index)}
            style={[s.tab, tab === index && s.tabActive]}
          >
            <Text style={[s.text, tab === index && s.gold]}>{title}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 0 && (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => openDevotional()}
          >
            <Card>
              <View style={s.row}>
                <Ionicons
                  name="sunny-outline"
                  size={28}
                  color={colors.goldInk}
                />
                <Text style={s.gold}>{c.daily}</Text>
              </View>
              <Heading>{c.devotionals[dailyIndex][0]}</Heading>
              <Body>{c.devotionals[dailyIndex][1]}</Body>
              <Text style={s.gold}>{c.open} →</Text>
            </Card>
          </Pressable>
          {!progressReady && <ActivityIndicator color={colors.goldInk} />}
          {progress.active !== null && (
            <Card>
              <Body small>{c.selected}</Body>
              <Text style={s.title}>{c.planTitles[progress.active]}</Text>
              <Body>
                {Math.min(
                  (progress.days[progress.active] ?? 0) + 1,
                  readingPlans[progress.active].length,
                )}{" "}
                / {readingPlans[progress.active].length}
              </Body>
              <Button
                title={
                  (progress.days[progress.active] ?? 0) >=
                  readingPlans[progress.active].length
                    ? c.completePlan
                    : c.continue
                }
                onPress={() => openPlan(progress.active!)}
              />
            </Card>
          )}
          {progress.active === null && (
            <Button
              secondary
              title={c.library + " →"}
              onPress={() => setTab(1)}
            />
          )}
          <Body small>{c.devotionalDescription}</Body>
        </>
      )}
      {tab === 1 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => openDevotional(true)}
        >
          <Card>
            <Text style={s.gold}>
              {c.daily} · 7 {c.days}
            </Text>
            <Text style={s.title}>{c.devotionalPlan}</Text>
            <Body>{c.devotionalDescription}</Body>
            <Text style={s.gold}>
              {progress.devotionalDay === null ? c.start : c.continue} →
            </Text>
          </Card>
        </Pressable>
      )}
      {tab === 1 && (
        <View style={s.grid}>
          {c.planTitles.map((title, index) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              onPress={() => openPlan(index)}
              style={s.plan}
            >
              <View style={s.art}>
                <Ionicons
                  name={icons[index % icons.length]}
                  size={38}
                  color={colors.goldInk}
                />
              </View>
              <Text style={s.title}>{title}</Text>
              <Body small>
                {readingPlans[index].length} {c.days} · 5–10 min
              </Body>
            </Pressable>
          ))}
        </View>
      )}
      {tab === 2 && (
        <>
          <Body small>
            {c.passage}:{" "}
            {verseId
              ? (getReadingVerse(verseId)?.reference ?? verseId)
              : "Genesis 1:1"}
          </Body>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setWords(true);
              setDetail(null);
              setDevotional(false);
            }}
            style={s.tool}
          >
            <Ionicons
              name="language-outline"
              size={25}
              color={colors.goldInk}
            />
            <Text style={[s.title, s.grow]}>{c.original}</Text>
            <Text style={s.gold}>›</Text>
          </Pressable>
          {[c.theologyTool, c.context, c.sources].map((title, index) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              onPress={() =>
                void openContext(
                  (["theology", "deeper", "sources"] as const)[index],
                )
              }
              style={s.tool}
            >
              <Ionicons
                name="library-outline"
                size={25}
                color={colors.goldInk}
              />
              <Text style={[s.title, s.grow]}>{title}</Text>
              <Text style={s.gold}>›</Text>
            </Pressable>
          ))}
          {loading && <ActivityIndicator color={colors.goldInk} />}
          {readError && <Body>{c.unavailable}</Body>}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/bible")}
            style={s.tool}
          >
            <Ionicons name="book-outline" size={25} color={colors.goldInk} />
            <Text style={[s.title, s.grow]}>{c.passage}</Text>
            <Text style={s.gold}>›</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/explore?category=discussions")}
            style={s.tool}
          >
            <Ionicons name="people-outline" size={25} color={colors.goldInk} />
            <Text style={[s.title, s.grow]}>{c.discussion}</Text>
            <Text style={s.gold}>›</Text>
          </Pressable>
        </>
      )}
      {progressError && (
        <Button
          secondary
          title={c.retry}
          onPress={() => {
            setProgressReady(false);
            setProgressError(false);
            setProgressAttempt(progressAttempt + 1);
          }}
        />
      )}
      <Modal
        visible={detail !== null || devotional || words}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={s.shade}>
          <View style={s.sheet}>
            <ScrollView contentContainerStyle={s.sheetContent}>
              {words ? (
                <>
                  <Heading>{c.original}</Heading>
                  <StepBibleSearch language={profile.language} />
                </>
              ) : (
                <>
                  <Heading>
                    {detail !== null ? c.planTitles[detail] : daily[0]}
                  </Heading>
                  {loading && <ActivityIndicator color={colors.goldInk} />}
                  {readError && <Body>{c.unavailable}</Body>}
                  {reading.length > 0 && (
                    <>
                      <Body small>{reading[0].editionName}</Body>
                      {reading.map((verse) => (
                        <Pressable
                          key={verse.id}
                          accessibilityRole="button"
                          onPress={() => {
                            close();
                            router.push({
                              pathname: "/verse/[id]",
                              params: { id: toVerseRoute(verse.id) },
                            });
                          }}
                        >
                          <Body small>{verse.reference}</Body>
                          <Text selectable style={s.reading}>
                            {verse.text}
                          </Text>
                        </Pressable>
                      ))}
                      <Body small>{reading[0].attribution}</Body>
                    </>
                  )}
                  {devotional ? (
                    <>
                      <Text style={s.title}>{c.reflect}</Text>
                      <Body>{daily[1]}</Body>
                      <Text style={s.title}>{c.pray}</Text>
                      <Body>{daily[2]}</Body>
                      <Text style={s.title}>{c.action}</Text>
                      <Body>{c.devotionalActions[devotionalIndex]}</Body>
                      {devotionalPlanMode && (
                        <Button
                          title={
                            progress.devotionalDay === null
                              ? c.start
                              : progress.devotionalDay >= 7
                                ? c.completePlan
                                : c.complete
                          }
                          loading={saving}
                          disabled={
                            !owner ||
                            !progressReady ||
                            loading ||
                            readError ||
                            progress.devotionalDay === 7
                          }
                          onPress={() =>
                            void saveProgress({
                              ...progress,
                              devotionalDay:
                                progress.devotionalDay === null
                                  ? 0
                                  : progress.devotionalDay + 1,
                            }).then((saved) => {
                              if (saved) close();
                            })
                          }
                        />
                      )}
                      <Body small>
                        {c.originalDevotional}
                        {devotionalPlanMode
                          ? ` · ${devotionalIndex + 1}/7`
                          : ""}
                      </Body>
                    </>
                  ) : (
                    detail !== null && (
                      <>
                        <Body>{c.question}</Body>
                        <Button
                          title={
                            progress.active !== detail
                              ? c.start
                              : (progress.days[detail] ?? 0) >=
                                  readingPlans[detail].length
                                ? c.completePlan
                                : c.complete
                          }
                          loading={saving}
                          disabled={
                            !progressReady ||
                            !owner ||
                            loading ||
                            readError ||
                            (progress.days[detail] ?? 0) >=
                              readingPlans[detail].length
                          }
                          onPress={() => {
                            void saveProgress({
                              ...progress,
                              active: detail,
                              days: {
                                ...progress.days,
                                [detail]:
                                  (progress.days[detail] ?? 0) +
                                  (progress.active === detail ? 1 : 0),
                              },
                            }).then((saved) => {
                              if (saved) close();
                            });
                          }}
                        />
                        <Body small>{c.localProgress}</Body>
                        {progressError && (
                          <Button
                            secondary
                            title={c.retry}
                            onPress={() =>
                              setProgressAttempt(progressAttempt + 1)
                            }
                          />
                        )}
                      </>
                    )
                  )}
                </>
              )}
              <Button title={c.close} secondary onPress={close} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  text: { color: colors.ink, fontSize: 14 },
  gold: { color: colors.goldInk, fontSize: 13, letterSpacing: 0.5 },
  title: { color: colors.ink, fontSize: 18, fontWeight: "600" },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  tabActive: { borderColor: colors.goldInk },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  plan: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 19,
    padding: 16,
    gap: 10,
  },
  art: {
    height: 75,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pale,
    borderRadius: 12,
  },
  tool: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  grow: { flex: 1 },
  shade: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#0009",
  },
  sheet: { maxHeight: "88%", borderRadius: 24, backgroundColor: colors.paper },
  sheetContent: { padding: 24, gap: 20 },
  reading: {
    fontFamily: serif,
    fontSize: 23,
    lineHeight: 35,
    color: colors.ink,
  },
});
