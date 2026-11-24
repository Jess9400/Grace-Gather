import {
  StudyAction as Button,
  StudyLink,
  StudyHeader,
} from "../components/StudyControls";
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
  colors,
  serif,
} from "../components/quiet-ui";
import StepBibleSearch from "../components/StepBibleSearch";
import { useApp } from "../lib/state";
import * as storage from "../lib/storage";
import {
  planPassage,
  normalizePlanProgress,
  readingPlanLength,
  yearPlanIndex,
  yearDayPassages,
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
import { data } from "../lib/content";
import StudyArtwork from "../components/StudyArtwork";
import StudyPassagePicker from "../components/StudyPassagePicker";
import { StudyPage } from "../components/VerseStudy";
import VerseNotes from "../components/VerseNotes";
import StudyNotebook from "../components/StudyNotebook";
import ReadingTogether from "../components/ReadingTogether";
import { studyNotebook } from "../lib/study-notebook";
import { studyStats } from "../lib/study-progress";
import { setStudyDiscussionTopic } from "../lib/study-discussion-draft";
import { discussionVerseId } from "../lib/bible";
import workspaceCopy from "../lib/study-workspace-copy.json";
import copy from "../lib/pro-study-preview.json";

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
  const initialVerse = params.verse ? fromVerseRoute(params.verse) : null;
  const [selectedVerse, setSelectedVerse] = useState<ReadingVerse | null>(null);
  const [picker, setPicker] = useState(false);
  const [selectionError, setSelectionError] = useState(false);
  const [selectionAttempt, setSelectionAttempt] = useState(0);
  const [tool, setTool] = useState<"deeper" | "sources" | "theology" | null>(
    null,
  );
  const [notebook, setNotebook] = useState(false);
  const [together, setTogether] = useState<{ plan: number | null } | null>(
    null,
  );
  const [noteCount, setNoteCount] = useState<number | null>(null);
  const [noteRevision, setNoteRevision] = useState(0);
  const [planIntro, setPlanIntro] = useState(true);
  const c = copy[profile.language];
  const n = workspaceCopy[profile.language];
  const edition = data.editions.find(
    (edition) => edition.id === profile.edition,
  );
  const curated: ReadingVerse[] = (edition?.passages ?? []).map((verse) => ({
    ...verse,
    notes: [],
    editionName: edition!.name,
    attribution: edition!.attribution,
    licenseUrl: edition!.licenseUrl,
  }));
  const collection = studyCollectionFor(profile);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (collection) await ensureCollection(collection);
        const provided = initialVerse ? getReadingVerse(initialVerse) : null;
        const fallback = collection ? chapterRows(0, 1, collection)[0] : null;
        const chosen =
          provided ??
          fallback ??
          (edition?.passages[0]
            ? {
                ...edition.passages[0],
                notes: [],
                editionName: edition.name,
                attribution: edition.attribution,
                licenseUrl: edition.licenseUrl,
              }
            : null);
        if (active) {
          setSelectedVerse(chosen);
          setSelectionError(!chosen);
        }
      } catch {
        if (active) setSelectionError(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [collection, initialVerse, edition, selectionAttempt]);
  useEffect(() => {
    let active = true;
    studyNotebook<{ notes: number }>("stats")
      .then((value) => {
        if (active) setNoteCount(value.notes);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [noteRevision]);
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
  const [devotionalPreviewIndex, setDevotionalPreviewIndex] = useState<
    number | null
  >(null);
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
    : (devotionalPreviewIndex ?? dailyIndex);
  const daily = c.devotionals[devotionalIndex];
  useEffect(() => {
    let active = true;
    storage
      .getItem("profile-owner")
      .then(async (id) => {
        const value = id
          ? ((await storage.getItem(`study-plans:${id}:${profile.edition}`)) ??
            (await storage.getItem(`study-plans:${id}`)))
          : null;
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
  }, [progressAttempt, invalidateReadings, profile.edition]);
  const saveProgress = async (next: PlanProgress) => {
    if (!owner || writeLock.current) return false;
    writeLock.current = true;
    setSaving(true);
    setProgressError(false);
    try {
      await storage.setItem(
        `study-plans:${owner}:${profile.edition}`,
        JSON.stringify(next),
      );
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
  const loadReading = async (passages: PlanPassage | PlanPassage[]) => {
    const ticket = ++readSequence.current;
    setReading([]);
    setLoading(true);
    setReadError(false);
    try {
      if (!collection) throw Error("No collection");
      await ensureCollection(collection);
      const rows = (Array.isArray(passages) ? passages : [passages]).flatMap(
        (passage) => {
          const book = collections[collection].index.books.findIndex(
            (b) => b.code === passage.book,
          );
          return chapterRows(book, passage.chapter, collection).filter(
            (v) =>
              (!passage.from ||
                Number(v.id.split(".").pop()) >= passage.from) &&
              (!passage.to || Number(v.id.split(".").pop()) <= passage.to),
          );
        },
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
  const readPlanDay = (index: number) => {
    const day = Math.min(
      progress.days[index] ?? 0,
      readingPlanLength(index) - 1,
    );
    const passages =
      index === yearPlanIndex
        ? collection
          ? yearDayPassages(collections[collection].index.books, day)
          : []
        : [planPassage(index, day, collection ?? "")!];
    void loadReading(passages);
  };
  const openPlan = (index: number) => {
    setWords(false);
    setDevotional(false);
    setPlanIntro(true);
    setDetail(index);
    setReading([]);
  };
  const openDevotional = (
    asPlan = false,
    previewIndex: number | null = null,
  ) => {
    setDevotionalPreviewIndex(previewIndex);
    setDevotionalPlanMode(asPlan);
    setWords(false);
    setDetail(null);
    setDevotional(true);
    const index = asPlan
      ? Math.min(progress.devotionalDay ?? 0, 6)
      : (previewIndex ?? dailyIndex);
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
  const chooseVerse = (verse: ReadingVerse) => {
    setSelectedVerse(verse);
    setPicker(false);
  };
  const openDiscussion = () => {
    if (!selectedVerse) return;
    setStudyDiscussionTopic(selectedVerse.reference);
    router.push({
      pathname: "/friends",
      params: {
        compose: "1",
        view: "discussions",
        verse: discussionVerseId(selectedVerse.id) ?? undefined,
      },
    });
  };
  const stats = studyStats(
    progress,
    collection ? collections[collection].index.books : [],
  );
  return (
    <Screen back home place="bible">
      <View style={s.row}>
        <Heading>{c.study}</Heading>
        <Text style={s.gold}>✧ PRO</Text>
      </View>
      <Body>{c.intro}</Body>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={c.passage}
        onPress={() => setPicker(true)}
        style={s.passage}
      >
        <View style={s.row}>
          <Text style={s.gold}>{c.passage}</Text>
          <Ionicons name="chevron-down" size={19} color={colors.goldInk} />
        </View>
        <Text style={s.title}>{selectedVerse?.reference ?? c.loading}</Text>
        {selectedVerse && (
          <>
            <Body small>{selectedVerse.editionName}</Body>
            <Text style={s.passageText} numberOfLines={3}>
              {selectedVerse.text}
            </Text>
          </>
        )}
      </Pressable>
      {selectionError && (
        <Button
          secondary
          title={c.retry}
          onPress={() => {
            setSelectionError(false);
            setSelectionAttempt((a) => a + 1);
          }}
        />
      )}
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
              <StudyArtwork hero animated={tab === 0} variant={dailyIndex} />
              <Body small>
                {new Intl.DateTimeFormat(profile.language, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                }).format(date)}
              </Body>
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
          <Text style={s.title}>{n.moreDevotionals}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
          >
            {[(dailyIndex + 6) % 7, (dailyIndex + 1) % 7].map((index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                onPress={() => openDevotional(false, index)}
                style={{
                  width: 220,
                  gap: 12,
                  backgroundColor: colors.white,
                  padding: 16,
                  borderRadius: 20,
                }}
              >
                <StudyArtwork variant={index} />
                <Text style={s.title}>{c.devotionals[index][0]}</Text>
                <Text style={s.gold}>{c.open} →</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={s.title}>{n.progress}</Text>
          <View style={s.stats}>
            {[
              [stats.readings, n.readings],
              [stats.books, n.booksRead],
              [noteCount ?? "—", n.notesCount],
            ].map(([value, label]) => (
              <View key={label} style={s.stat}>
                <Text style={s.statValue}>{value}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <StudyLink
            title={n.myNotes}
            icon="document-text-outline"
            onPress={() => setNotebook(true)}
          />
          <StudyLink
            title={n.readingTogether}
            icon="people-outline"
            onPress={() => setTogether({ plan: null })}
          />
          {!progressReady && <ActivityIndicator color={colors.goldInk} />}
          {progress.active !== null && (
            <Card>
              <Body small>{c.selected}</Body>
              <Text style={s.title}>{c.planTitles[progress.active]}</Text>
              <Body>
                {Math.min(
                  (progress.days[progress.active] ?? 0) + 1,
                  readingPlanLength(progress.active),
                )}{" "}
                / {readingPlanLength(progress.active)}
              </Body>
              <Button
                title={
                  (progress.days[progress.active] ?? 0) >=
                  readingPlanLength(progress.active)
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
            <StudyArtwork variant={1} hero />
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
              <StudyArtwork variant={index} />
              <Text style={s.title}>{title}</Text>
              <Body small>{n.planDescriptions[index]}</Body>
              <Body small>
                {readingPlanLength(index)} {c.days} ·{" "}
                {index === yearPlanIndex ? n.yearMinutes : "5–10 min"}
              </Body>
            </Pressable>
          ))}
        </View>
      )}
      {tab === 2 && (
        <>
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
          {[c.theologyTool, c.context].map((title, index) => (
            <Pressable
              key={title}
              accessibilityRole="button"
              disabled={!selectedVerse}
              onPress={() => setTool((["theology", "deeper"] as const)[index])}
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
          {selectedVerse && (
            <VerseNotes
              verse={selectedVerse.id}
              reference={selectedVerse.reference}
              language={profile.language}
              onSaved={() => setNoteRevision((n) => n + 1)}
            />
          )}
          <StudyLink
            title={n.myNotes}
            icon="document-text-outline"
            onPress={() => setNotebook(true)}
          />
          {loading && <ActivityIndicator color={colors.goldInk} />}
          {readError && <Body>{c.unavailable}</Body>}

          <Pressable
            accessibilityRole="button"
            onPress={openDiscussion}
            style={s.tool}
          >
            <Ionicons name="people-outline" size={25} color={colors.goldInk} />
            <Text style={[s.title, s.grow]}>{c.discussion}</Text>
            <Text style={s.gold}>›</Text>
          </Pressable>
        </>
      )}
      {tab === 2 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.sources}
          disabled={!selectedVerse}
          onPress={() => setTool("sources")}
          style={{
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 12 }}>{c.sources}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.muted} />
        </Pressable>
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
            <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
              <StudyHeader
                title={words ? c.original : detail !== null ? c.plans : c.daily}
                closeLabel={c.close}
                onClose={close}
              />
            </View>
            <ScrollView contentContainerStyle={s.sheetContent}>
              {words ? (
                <>
                  <StepBibleSearch language={profile.language} />
                </>
              ) : (
                <>
                  <StudyArtwork hero animated variant={detail ?? dailyIndex} />
                  <Heading>
                    {detail !== null ? c.planTitles[detail] : daily[0]}
                  </Heading>
                  {detail !== null && planIntro ? (
                    <>
                      <Body small>
                        {readingPlanLength(detail)} {c.days} ·{" "}
                        {detail === yearPlanIndex ? n.yearMinutes : "5–10 min"}
                      </Body>
                      <Text style={s.gold}>{n.aboutPlan}</Text>
                      <Body>{n.planDescriptions[detail]}</Body>
                      <Button
                        title={
                          progress.active === detail ? c.continue : c.start
                        }
                        disabled={
                          !owner || saving || !progressReady || !collection
                        }
                        loading={saving}
                        onPress={() =>
                          void saveProgress({
                            ...progress,
                            active: detail,
                          }).then((saved) => {
                            if (saved) {
                              setPlanIntro(false);
                              readPlanDay(detail);
                            }
                          })
                        }
                      />
                      {!collection && <Body>{c.unavailable}</Body>}
                      <Button
                        secondary
                        title={n.readingTogether}
                        onPress={() => {
                          const plan = detail;
                          close();
                          setTogether({ plan });
                        }}
                      />
                    </>
                  ) : (
                    <>
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
                                setSelectedVerse(verse);
                                setTab(2);
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
                                      readingPlanLength(detail)
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
                                  readingPlanLength(detail)
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
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {picker && (
        <StudyPassagePicker
          key={profile.edition}
          collection={collection}
          curated={curated}
          language={profile.language}
          onSelect={chooseVerse}
          onClose={() => setPicker(false)}
        />
      )}
      {tool && selectedVerse && (
        <StudyPage
          key={`${selectedVerse.id}:${tool}`}
          id={selectedVerse.id}
          panel={tool}
          onPanelClose={() => setTool(null)}
        />
      )}
      {notebook && (
        <StudyNotebook
          language={profile.language}
          onClose={() => {
            setNotebook(false);
            setNoteRevision((n) => n + 1);
          }}
          onOpenVerse={(id) => {
            const verse = getReadingVerse(id);
            if (verse) {
              setSelectedVerse(verse);
              setTab(2);
              setNotebook(false);
            } else {
              setNotebook(false);
              router.push({
                pathname: "/verse/[id]",
                params: { id: toVerseRoute(id) },
              });
            }
          }}
        />
      )}
      {together && (
        <ReadingTogether
          language={profile.language}
          plan={together.plan}
          onClose={() => setTogether(null)}
          onReadPlan={(plan) => {
            setTogether(null);
            openPlan(plan);
          }}
        />
      )}
    </Screen>
  );
}
const s = StyleSheet.create({
  passage: {
    padding: 18,
    gap: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  passageText: {
    color: colors.ink,
    fontFamily: serif,
    fontSize: 21,
    lineHeight: 31,
  },
  stats: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  stat: {
    flex: 1,
    minWidth: 92,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    gap: 6,
  },
  statValue: { color: colors.goldInk, fontSize: 29, fontFamily: serif },
  statLabel: { color: colors.muted, fontSize: 12, lineHeight: 18 },
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
