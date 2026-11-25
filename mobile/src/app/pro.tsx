import {
  StudyAction as Button,
  StudyLink,
  StudyHeader,
} from "../components/StudyControls";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  type ScrollViewInstance,
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
import DailyDevotional from "../components/DailyDevotional";
import OriginalScripture from "../components/OriginalScripture";
import StudyTraditions from "../components/StudyTraditions";
import originalCopy from "../lib/original-study-copy.json";
import { useApp } from "../lib/state";
import { useReducedMotion } from "../lib/use-reduced-motion";
import * as storage from "../lib/storage";
import {
  planPassage,
  normalizePlanProgress,
  readingPlanLength,
  yearPlanIndex,
  yearDayPassages,
  planFilters,
  planMatches,
  type PlanFilter,
  type PlanProgress,
  type PlanPassage,
} from "../lib/reading-plans";
import {
  collections,
  ensureCollection,
  studyCollectionFor,
  chapterRows,
  getReadingVerse,
  type CollectionId,
  type ReadingVerse,
} from "../lib/bible";
import { fromVerseRoute, toVerseRoute } from "../lib/verse-route";
import { data } from "../lib/content";
import StudyArtwork, { studyGlyph } from "../components/StudyArtwork";
import StudyPassagePicker from "../components/StudyPassagePicker";
import { StudyPage } from "../components/VerseStudy";
import VerseNotes from "../components/VerseNotes";
import StudyNotebook from "../components/StudyNotebook";
import ReadingTogether from "../components/ReadingTogether";
import { studyNotebook } from "../lib/study-notebook";
import {
  studyStats,
  mergePlanProgress,
  samePlanProgress,
  normalizeToday,
  mergeToday,
  type TodayRecord,
} from "../lib/study-progress";
import { readAccountStudy, saveAccountStudy } from "../lib/study-progress-sync";
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
// The verses of one plan or devotional passage in the reader's Bible.
function passageRows(collection: CollectionId, passage: PlanPassage) {
  const book = collections[collection].index.books.findIndex(
    (b) => b.code === passage.book,
  );
  return chapterRows(book, passage.chapter, collection).filter(
    (v) =>
      (!passage.from || Number(v.id.split(".").pop()) >= passage.from) &&
      (!passage.to || Number(v.id.split(".").pop()) <= passage.to),
  );
}
function devotionalPassage(index: number, collection: string | null) {
  const passage = { ...devotionalPassages[index] };
  // Psalm 107 is Psalm 106 in the Greek numbering these editions follow.
  if (
    passage.book === "PSA" &&
    ["dra", "brenton", "synodal"].includes(collection ?? "")
  )
    passage.chapter = 106;
  return passage;
}
// Which of the seven devotionals belongs to a calendar day.
function dayIndex(date: Date) {
  return (
    Math.floor(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000,
    ) % 7
  );
}
function dayKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function chapterOf(reference: string) {
  return reference.replace(/:\d+$/, "");
}
// "Mark 1", "Philippians 4:6–7" or "Genesis 1, Genesis 2" for a reading.
function passageLabel(verses: ReadingVerse[], passages: PlanPassage[]) {
  const chapters = [...new Set(verses.map((v) => chapterOf(v.reference)))];
  if (chapters.length > 3)
    return `${chapters[0]} – ${chapters[chapters.length - 1]}`;
  if (chapters.length > 1) return chapters.join(", ");
  if (!passages[0]?.from) return chapters[0];
  return verses.length > 1
    ? `${chapters[0]}:${passages[0].from}–${verses[verses.length - 1].id.split(".").pop()}`
    : verses[0].reference;
}
// Scripture as running text with small verse numbers, one block per chapter.
// Tapping a verse opens it in Study.
function ScriptureText({
  verses,
  onVerse,
}: {
  verses: ReadingVerse[];
  onVerse: (verse: ReadingVerse) => void;
}) {
  const groups: ReadingVerse[][] = [];
  for (const verse of verses) {
    const last = groups[groups.length - 1];
    if (last && chapterOf(last[0].reference) === chapterOf(verse.reference))
      last.push(verse);
    else groups.push([verse]);
  }
  return (
    <View style={s.passage}>
      {groups.map((group) => (
        <View key={group[0].id} style={s.passage}>
          {groups.length > 1 && (
            <Text style={s.chapterLabel}>{chapterOf(group[0].reference)}</Text>
          )}
          <Text style={s.reading}>
            {group.map((verse) => (
              <Text key={verse.id} onPress={() => onVerse(verse)}>
                <Text style={s.verseNumber}>
                  {verse.id.split(".").pop()}
                  {"\u00A0"}
                </Text>
                {verse.text}{" "}
              </Text>
            ))}
          </Text>
        </View>
      ))}
    </View>
  );
}
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
  // Each Bible edition keeps its own plan progress (their Psalms differ).
  const plansScope = `plans-${profile.edition}`;
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (collection) await ensureCollection(collection);
        const provided = initialVerse ? getReadingVerse(initialVerse) : null;
        // With no verse chosen, Study opens on today's devotional verse.
        const todays = collection
          ? passageRows(
              collection,
              devotionalPassage(dayIndex(new Date()), collection),
            )[0]
          : null;
        const fallback = collection ? chapterRows(0, 1, collection)[0] : null;
        const chosen =
          provided ??
          todays ??
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
  const [original, setOriginal] = useState(false);
  const [traditions, setTraditions] = useState(false);
  const [reading, setReading] = useState<ReadingVerse[]>([]);
  const [readingPassages, setReadingPassages] = useState<PlanPassage[]>([]);
  // The guided devotional's step: Read, Reflect, Pray, One action.
  const [devStep, setDevStep] = useState(0);
  // The plan day just marked read, for the "Day 3 done" moment.
  const [finished, setFinished] = useState<number | null>(null);
  const sheetScroll = useRef<ScrollViewInstance>(null);
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
  const dailyIndex = dayIndex(date);
  const devotionalIndex = devotionalPlanMode
    ? Math.min(progress.devotionalDay ?? 0, 6)
    : (devotionalPreviewIndex ?? dailyIndex);
  const daily = c.devotionals[devotionalIndex];
  const [filter, setFilter] = useState<PlanFilter>("all");
  const reducedMotion = useReducedMotion();
  // Today's Read · Reflect · Pray, and the days with a finished reading,
  // kept on this device for the account.
  const today = dayKey(date);
  const [steps, setSteps] = useState<number[]>([]);
  const [quietDays, setQuietDays] = useState<string[]>([]);
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
        if (!id) return;
        // Then bring in what the account holds, from other devices.
        const remote = await readAccountStudy(plansScope).catch(
          () => undefined,
        );
        if (remote === undefined || !active) return;
        // Read this device again, in case a day was marked meanwhile.
        const latest =
          (await storage.getItem(`study-plans:${id}:${profile.edition}`)) ??
          (await storage.getItem(`study-plans:${id}`));
        const mine = latest ? JSON.parse(latest) : null;
        const theirs = remote?.state as { updatedAt?: string } | undefined;
        const mineAt =
          typeof mine?.updatedAt === "string" ? mine.updatedAt : "";
        const theirAt =
          typeof theirs?.updatedAt === "string" ? theirs.updatedAt : "";
        const local = normalizePlanProgress(mine);
        const account = normalizePlanProgress(theirs ?? null);
        const merged = mergePlanProgress(local, account, theirAt > mineAt);
        const stamped = {
          ...merged,
          updatedAt: theirAt > mineAt ? theirAt : mineAt || theirAt,
        };
        if (!active) return;
        setProgress(merged);
        if (!samePlanProgress(merged, local))
          await storage
            .setItem(
              `study-plans:${id}:${profile.edition}`,
              JSON.stringify(stamped),
            )
            .catch(() => {});
        if (!remote || !samePlanProgress(merged, account))
          await saveAccountStudy(plansScope, stamped).catch(() => {});
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
  }, [progressAttempt, invalidateReadings, profile.edition, plansScope]);
  useEffect(() => {
    let active = true;
    if (!owner) return;
    const show = (record: TodayRecord) => {
      setSteps(record.day === today ? record.done : []);
      setQuietDays(record.days);
    };
    async function load(id: string) {
      const read = async () =>
        normalizeToday(
          JSON.parse((await storage.getItem(`study-today:${id}`)) ?? "null"),
        );
      const local = await read();
      if (active) show(local);
      // Then bring in the account's record from other devices.
      const remote = await readAccountStudy("today").catch(() => undefined);
      if (remote === undefined || !active) return;
      const latest = await read();
      const account = normalizeToday(remote?.state ?? null);
      const merged = mergeToday(latest, account);
      if (!active) return;
      show(merged);
      const text = JSON.stringify(merged);
      if (text !== JSON.stringify(latest))
        await storage.setItem(`study-today:${id}`, text).catch(() => {});
      if (!remote || text !== JSON.stringify(account))
        await saveAccountStudy("today", merged).catch(() => {});
    }
    void load(owner).catch(() => {});
    return () => {
      active = false;
    };
  }, [owner, today]);
  const saveToday = (nextSteps: number[], finishedToday = false) => {
    const nextDays =
      finishedToday && !quietDays.includes(today)
        ? [...quietDays, today].slice(-30)
        : quietDays;
    setSteps(nextSteps);
    setQuietDays(nextDays);
    if (!owner) return;
    const record: TodayRecord = { day: today, done: nextSteps, days: nextDays };
    storage
      .setItem(`study-today:${owner}`, JSON.stringify(record))
      .catch(() => {});
    saveAccountStudy("today", record).catch(() => {});
  };
  const saveProgress = async (next: PlanProgress) => {
    if (!owner || writeLock.current) return false;
    writeLock.current = true;
    setSaving(true);
    setProgressError(false);
    try {
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      await storage.setItem(
        `study-plans:${owner}:${profile.edition}`,
        JSON.stringify(stamped),
      );
      setProgress(next);
      // The account copy follows; if offline, the next visit catches up.
      saveAccountStudy(plansScope, stamped).catch(() => {});
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
        (passage) => passageRows(collection, passage),
      );
      if (ticket === readSequence.current) {
        setReading(rows);
        setReadingPassages(Array.isArray(passages) ? passages : [passages]);
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
    setOriginal(false);
    setTraditions(false);
    setDevotional(false);
    setFinished(null);
    setPlanIntro(true);
    setDetail(index);
    setReading([]);
  };
  // The current plan opens straight on today's reading.
  const openPlanReading = (index: number) => {
    if (planDone(index)) return openPlan(index);
    setWords(false);
    setOriginal(false);
    setTraditions(false);
    setDevotional(false);
    setFinished(null);
    setPlanIntro(false);
    setDetail(index);
    readPlanDay(index);
  };
  const openDevotional = (
    asPlan = false,
    previewIndex: number | null = null,
    startStep = 0,
  ) => {
    setDevStep(startStep);
    setDevotionalPreviewIndex(previewIndex);
    setDevotionalPlanMode(asPlan);
    setWords(false);
    setOriginal(false);
    setTraditions(false);
    setDetail(null);
    setDevotional(true);
    const index = asPlan
      ? Math.min(progress.devotionalDay ?? 0, 6)
      : (previewIndex ?? dailyIndex);
    void loadReading(devotionalPassage(index, collection));
  };
  const close = () => {
    readSequence.current++;
    setFinished(null);
    setDetail(null);
    setDevotional(false);
    setWords(false);
    setOriginal(false);
    setTraditions(false);
    setReading([]);
  };
  const studyVerse = (verse: ReadingVerse) => {
    close();
    setSelectedVerse(verse);
    setTab(2);
  };
  const todayDevotional =
    !devotionalPlanMode && devotionalPreviewIndex === null;
  const goToStep = (step: number) => {
    setDevStep(step);
    sheetScroll.current?.scrollTo({ y: 0, animated: false });
  };
  // Moving on from Read, Reflect or Pray ticks it on today's card.
  const nextStep = () => {
    if (todayDevotional && devStep < 3 && !steps.includes(devStep))
      saveToday([...steps, devStep].sort());
    goToStep(devStep + 1);
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
  const planDay = (index: number) =>
    Math.min((progress.days[index] ?? 0) + 1, readingPlanLength(index));
  const dayOf = (index: number) =>
    c.dayOf
      .replace("{day}", String(planDay(index)))
      .replace("{total}", String(readingPlanLength(index)));
  const longDate = new Intl.DateTimeFormat(profile.language, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
  const stepLabels = [c.readStep, c.reflect, c.pray, c.action];
  const stepIcons = [
    "book-outline",
    "leaf-outline",
    "flame-outline",
    "footsteps-outline",
  ] as const;
  // The last seven days, oldest first, for the gentle "Your week" row.
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date);
    day.setDate(day.getDate() - (6 - index));
    return {
      key: dayKey(day),
      letter: new Intl.DateTimeFormat(profile.language, {
        weekday: "narrow",
      }).format(day),
      done: quietDays.includes(dayKey(day)),
    };
  });
  const planDone = (index: number) =>
    (progress.days[index] ?? 0) >= readingPlanLength(index);
  const active = progress.active;
  const tabs = [c.tabToday, c.tabPlans, c.tabStudy];
  const studyTools: {
    title: string;
    icon: ComponentProps<typeof Ionicons>["name"];
    onPress: () => void;
    needsVerse?: boolean;
  }[] = [
    {
      title: c.toolWords,
      icon: "language-outline",
      onPress: () => {
        setWords(true);
        setDetail(null);
        setDevotional(false);
      },
    },
    {
      title: originalCopy[profile.language].title,
      icon: "swap-horizontal-outline",
      onPress: () => {
        setOriginal(true);
        setWords(false);
        setTraditions(false);
        setDetail(null);
        setDevotional(false);
      },
    },
    {
      title: originalCopy[profile.language].theology,
      icon: "people-outline",
      onPress: () => {
        setTraditions(true);
        setOriginal(false);
        setWords(false);
        setDetail(null);
        setDevotional(false);
      },
    },
    {
      title: c.toolContext,
      icon: "time-outline",
      onPress: () => setTool("deeper"),
      needsVerse: true,
    },
    {
      title: c.theologyTool,
      icon: "library-outline",
      onPress: () => setTool("theology"),
      needsVerse: true,
    },
    {
      title: c.toolDiscuss,
      icon: "chatbubbles-outline",
      onPress: openDiscussion,
      needsVerse: true,
    },
  ];
  return (
    <Screen back home place="bible">
      <View style={s.titleRow}>
        <View style={s.grow}>
          <Text style={s.date}>
            {new Intl.DateTimeFormat(profile.language, {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(date)}
          </Text>
          <Heading>{c.study}</Heading>
        </View>
        <View style={s.proPill}>
          <Ionicons name="sparkles" size={11} color={colors.gold} />
          <Text style={s.proText}>PRO</Text>
        </View>
      </View>
      <View style={s.segment} accessibilityRole="tablist">
        {tabs.map((title, index) => (
          <Pressable
            key={title}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === index }}
            onPress={() => setTab(index)}
            style={[s.segmentItem, tab === index && s.segmentActive]}
          >
            <Text
              numberOfLines={1}
              style={[s.segmentText, tab === index && s.segmentTextActive]}
            >
              {title}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 0 && (
        <>
          <DailyDevotional
            language={profile.language}
            collection={collection}
            onFinished={() => saveToday([0, 1, 2], true)}
          />
          {!progressReady && <ActivityIndicator color={colors.goldInk} />}
          {progressReady && active !== null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${c.continue}: ${c.planTitles[active]}, ${dayOf(active)}`}
              onPress={() => openPlanReading(active)}
              style={s.continue}
            >
              <View style={s.cover}>
                <Ionicons
                  name={studyGlyph(active)}
                  size={24}
                  color={colors.goldInk}
                />
              </View>
              <View style={s.grow}>
                <Text style={s.gold}>
                  {planDone(active) ? c.completePlan : c.continue}
                </Text>
                <Text style={s.title}>{c.planTitles[active]}</Text>
                <Text style={s.small}>{dayOf(active)}</Text>
                <View style={s.bar}>
                  <View
                    style={[
                      s.barFill,
                      {
                        width: `${Math.round(((progress.days[active] ?? 0) / readingPlanLength(active)) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={s.go}>
                <Ionicons name="arrow-forward" size={18} color={colors.paper} />
              </View>
            </Pressable>
          )}
          {progressReady && active === null && (
            <Card>
              <View style={s.row}>
                <Text style={s.title}>{c.startWithPlan}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setTab(1)}
                  hitSlop={10}
                >
                  <Text style={s.gold}>{c.seeAll}</Text>
                </Pressable>
              </View>
              {[1, 0].map((index) => (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  onPress={() => openPlan(index)}
                  style={s.suggestion}
                >
                  <View style={[s.cover, s.coverSmall]}>
                    <Ionicons
                      name={studyGlyph(index)}
                      size={20}
                      color={colors.goldInk}
                    />
                  </View>
                  <View style={s.grow}>
                    <Text style={s.text}>{c.planTitles[index]}</Text>
                    <Text style={s.small}>
                      {readingPlanLength(index)} {c.days} · 5–10 min
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          )}
          {quietDays.length > 0 && (
            <View
              style={s.weekRow}
              accessible
              accessibilityLabel={`${c.yourWeek}: ${c.weekSummary.replace(
                "{count}",
                String(week.filter((day) => day.done).length),
              )}`}
            >
              <Text style={s.gold}>{c.yourWeek}</Text>
              <View style={s.weekDays}>
                {week.map((day) => (
                  <View
                    key={day.key}
                    style={[
                      s.weekDay,
                      day.done && s.weekDayDone,
                      day.key === today && s.weekToday,
                    ]}
                  >
                    {day.done ? (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={colors.paper}
                      />
                    ) : (
                      <Text style={s.weekLetter}>{day.letter}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
          {stats.readings > 0 && (
            <>
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
            </>
          )}
          <View style={s.list}>
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
          </View>
        </>
      )}
      {tab === 1 && (
        <>
          {active !== null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${c.continue}: ${c.planTitles[active]}, ${dayOf(active)}`}
              onPress={() => openPlanReading(active)}
              style={s.activeStrip}
            >
              <View style={s.activeDot} />
              <Text style={[s.text, s.grow]} numberOfLines={2}>
                {c.planTitles[active]}
                <Text style={s.small}> · {dayOf(active)}</Text>
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.goldInk}
              />
            </Pressable>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
          >
            {planFilters.map((id, index) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === id }}
                onPress={() => setFilter(id)}
                style={[s.chip, filter === id && s.chipActive]}
              >
                <Text
                  style={[s.chipText, filter === id && s.segmentTextActive]}
                >
                  {c.filters[index]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {["all", "short", "themes"].includes(filter) && (
            <Pressable
              accessibilityRole="button"
              onPress={() => openDevotional(true)}
              style={s.devotionalPlan}
            >
              <View style={[s.cover, s.coverSmall]}>
                <Ionicons
                  name="sunny-outline"
                  size={20}
                  color={colors.goldInk}
                />
              </View>
              <View style={s.grow}>
                <Text style={s.title}>{c.devotionalPlan}</Text>
                <Text style={s.small}>
                  7 {c.days} · {c.devotionalDescription}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.goldInk}
              />
            </Pressable>
          )}
          <View style={s.grid}>
            {c.planTitles.map((title, index) =>
              planMatches(index, filter) ? (
                <Pressable
                  key={title}
                  accessibilityRole="button"
                  onPress={() => openPlan(index)}
                  style={[s.plan, active === index && s.planActive]}
                >
                  <StudyArtwork variant={index} />
                  <Text style={s.planTitle}>{title}</Text>
                  <Text style={active === index ? s.gold : s.small}>
                    {active === index
                      ? `${c.inProgress} · ${dayOf(index)}`
                      : `${readingPlanLength(index)} ${c.days} · ${index === yearPlanIndex ? n.yearMinutes : "5–10 min"}`}
                  </Text>
                </Pressable>
              ) : null,
            )}
            {/* Keeps a lone last plan the same width as the others. */}
            {c.planTitles.filter((_, index) => planMatches(index, filter))
              .length %
              2 ===
              1 && <View style={[s.plan, s.planSpacer]} />}
          </View>
        </>
      )}
      {tab === 2 && (
        <>
          <View style={s.anchor}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${c.changePassage}: ${selectedVerse?.reference ?? c.loading}`}
              onPress={() => setPicker(true)}
              style={s.passagePill}
            >
              <Text style={[s.text, s.keep]} numberOfLines={1}>
                {selectedVerse?.reference ?? c.loading}
              </Text>
              {selectedVerse && (
                <Text style={[s.small, s.shrink]} numberOfLines={1}>
                  · {selectedVerse.editionName}
                </Text>
              )}
              <Ionicons name="chevron-down" size={15} color={colors.gold} />
            </Pressable>
            {selectedVerse && (
              <Text selectable style={s.anchorText}>
                {selectedVerse.text}
              </Text>
            )}
          </View>
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
          <View style={s.toolGrid}>
            {studyTools.map((item) => (
              <Pressable
                key={item.title}
                accessibilityRole="button"
                disabled={item.needsVerse && !selectedVerse}
                onPress={item.onPress}
                style={({ pressed }) => [
                  s.toolTile,
                  pressed && s.pressed,
                  item.needsVerse && !selectedVerse && s.disabled,
                ]}
              >
                <Ionicons name={item.icon} size={24} color={colors.goldInk} />
                <Text style={s.toolText} numberOfLines={1}>
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </View>
          {selectedVerse && (
            <VerseNotes
              verse={selectedVerse.id}
              reference={selectedVerse.reference}
              language={profile.language}
              onSaved={() => setNoteRevision((n) => n + 1)}
            />
          )}
          {loading && <ActivityIndicator color={colors.goldInk} />}
          {readError && <Body>{c.unavailable}</Body>}
          <View style={s.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setNotebook(true)}
              style={s.textLink}
            >
              <Ionicons
                name="document-text-outline"
                size={17}
                color={colors.goldInk}
              />
              <Text style={s.gold}>{n.myNotes}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.sources}
              disabled={!selectedVerse}
              onPress={() => setTool("sources")}
              style={s.textLink}
            >
              <Text style={s.small}>{c.sources}</Text>
              <Ionicons name="chevron-down" size={13} color={colors.muted} />
            </Pressable>
          </View>
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
        visible={
          detail !== null || devotional || words || original || traditions
        }
        transparent
        animationType={reducedMotion ? "none" : "slide"}
        onRequestClose={close}
      >
        <View style={s.shade}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.close}
            onPress={close}
            style={s.grow}
          />
          {/* Reading sheets keep one height, so Next and Mark read stay put. */}
          <View
            style={[
              s.sheet,
              (devotional || (detail !== null && !planIntro)) && s.sheetTall,
            ]}
          >
            <View style={s.grab} />
            <View style={{ paddingHorizontal: 22, paddingTop: 6 }}>
              <StudyHeader
                title={
                  original
                    ? originalCopy[profile.language].title
                    : traditions
                      ? originalCopy[profile.language].theology
                      : words
                        ? c.original
                        : devotional
                          ? devotionalPlanMode
                            ? c.devotionalPlan
                            : c.daily
                          : detail !== null && !planIntro
                            ? c.planTitles[detail]
                            : c.plans
                }
                closeLabel={c.close}
                onClose={close}
              />
            </View>
            <ScrollView
              ref={sheetScroll}
              style={
                devotional || (detail !== null && !planIntro)
                  ? s.grow
                  : s.sheetScroll
              }
              contentContainerStyle={s.sheetContent}
            >
              {words && <StepBibleSearch language={profile.language} />}
              {original && (
                <OriginalScripture
                  verse={selectedVerse}
                  language={profile.language}
                />
              )}
              {traditions && (
                <StudyTraditions
                  language={profile.language}
                  tradition={profile.tradition}
                />
              )}
              {devotional && (
                <>
                  <View style={s.eyebrow}>
                    <Ionicons
                      name="sunny-outline"
                      size={17}
                      color={colors.gold}
                    />
                    <Text style={s.gold}>
                      {devotionalPlanMode
                        ? c.dayOf
                            .replace("{day}", String(devotionalIndex + 1))
                            .replace("{total}", "7")
                        : longDate}
                    </Text>
                  </View>
                  <Heading>{daily[0]}</Heading>
                  <View
                    style={s.stepper}
                    accessible
                    accessibilityLabel={`${c.stepOf
                      .replace("{step}", String(devStep + 1))
                      .replace("{total}", "4")}: ${stepLabels[devStep]}`}
                  >
                    {stepLabels.map((label, index) => (
                      <View
                        key={label}
                        style={[s.stepBar, index <= devStep && s.stepBarOn]}
                      />
                    ))}
                  </View>
                  {/* A small gold label, then the words themselves, large. */}
                  <View style={s.labelRow}>
                    <Ionicons
                      name={stepIcons[devStep]}
                      size={16}
                      color={colors.goldInk}
                    />
                    <Text style={s.sectionLabel}>{stepLabels[devStep]}</Text>
                  </View>
                  {devStep === 0 && (
                    <>
                      {loading && <ActivityIndicator color={colors.goldInk} />}
                      {readError && <Body>{c.unavailable}</Body>}
                      {reading.length > 0 && (
                        <>
                          <Text style={s.gold}>
                            {passageLabel(reading, readingPassages)}
                          </Text>
                          <ScriptureText
                            verses={reading}
                            onVerse={studyVerse}
                          />
                          <Body small>{reading[0].attribution}</Body>
                        </>
                      )}
                    </>
                  )}
                  {devStep === 1 && (
                    <>
                      <Text style={s.reflectText}>{daily[1]}</Text>
                      {reading.length > 0 && (
                        <VerseNotes
                          verse={reading[0].id}
                          reference={passageLabel(reading, readingPassages)}
                          language={profile.language}
                          onSaved={() => setNoteRevision((n) => n + 1)}
                        />
                      )}
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          close();
                          router.push("/diary");
                        }}
                        style={s.textLink}
                      >
                        <Ionicons
                          name="create-outline"
                          size={17}
                          color={colors.goldInk}
                        />
                        <Text style={s.gold}>{c.journalInstead}</Text>
                      </Pressable>
                    </>
                  )}
                  {devStep === 2 && <Text style={s.prayer}>{daily[2]}</Text>}
                  {devStep === 3 && (
                    <>
                      <Card>
                        <Text style={s.actionText}>
                          {c.devotionalActions[devotionalIndex]}
                        </Text>
                      </Card>
                      <Body small>{c.originalDevotional}</Body>
                    </>
                  )}
                </>
              )}
              {detail !== null && planIntro && (
                <>
                  <StudyArtwork hero animated variant={detail} />
                  <Heading>{c.planTitles[detail]}</Heading>
                  <Body small>
                    {readingPlanLength(detail)} {c.days} ·{" "}
                    {detail === yearPlanIndex ? n.yearMinutes : "5–10 min"}
                  </Body>
                  <Text style={s.gold}>{n.aboutPlan}</Text>
                  <Body>{n.planDescriptions[detail]}</Body>
                  {progress.active !== null && progress.active !== detail && (
                    <Body small>
                      {c.switchNotice.replace(
                        "{plan}",
                        c.planTitles[progress.active],
                      )}
                    </Body>
                  )}
                  <Button
                    wide
                    title={progress.active === detail ? c.continue : c.start}
                    disabled={!owner || saving || !progressReady || !collection}
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
              )}
              {detail !== null && !planIntro && finished !== null && (
                <View style={s.finished}>
                  <View style={s.finishedMark}>
                    <Ionicons name="checkmark" size={30} color={colors.paper} />
                  </View>
                  <Heading>
                    {c.dayDone.replace("{day}", String(finished))}
                  </Heading>
                  <Body>
                    {finished >= readingPlanLength(detail)
                      ? c.planFinished
                      : c.nextTomorrow.replace("{day}", String(finished + 1))}
                  </Body>
                </View>
              )}
              {detail !== null && !planIntro && finished === null && (
                <>
                  <Text style={s.gold}>{dayOf(detail)}</Text>
                  {loading && <ActivityIndicator color={colors.goldInk} />}
                  {readError && <Body>{c.unavailable}</Body>}
                  {reading.length > 0 && (
                    <>
                      <Heading>
                        {passageLabel(reading, readingPassages)}
                      </Heading>
                      <ScriptureText verses={reading} onVerse={studyVerse} />
                      <Body small>{reading[0].attribution}</Body>
                      <Text style={s.sectionLabel}>{c.question}</Text>
                      <VerseNotes
                        verse={reading[0].id}
                        reference={passageLabel(reading, readingPassages)}
                        language={profile.language}
                        onSaved={() => setNoteRevision((n) => n + 1)}
                      />
                      <Body small>{c.localProgress}</Body>
                    </>
                  )}
                  {progressError && (
                    <Button
                      secondary
                      title={c.retry}
                      onPress={() => setProgressAttempt(progressAttempt + 1)}
                    />
                  )}
                </>
              )}
            </ScrollView>
            {devotional && (
              <View style={s.sheetFooter}>
                {devStep > 0 && (
                  <Button
                    secondary
                    title={c.back}
                    onPress={() => goToStep(devStep - 1)}
                  />
                )}
                <View style={s.grow}>
                  {devStep < 3 ? (
                    <Button wide title={c.next} onPress={nextStep} />
                  ) : devotionalPlanMode ? (
                    <Button
                      wide
                      title={
                        (progress.devotionalDay ?? 0) >= 7
                          ? c.completePlan
                          : c.markDay.replace(
                              "{day}",
                              String(devotionalIndex + 1),
                            )
                      }
                      loading={saving}
                      disabled={
                        !owner ||
                        !progressReady ||
                        (progress.devotionalDay ?? 0) >= 7
                      }
                      onPress={() =>
                        void saveProgress({
                          ...progress,
                          devotionalDay: Math.min(
                            (progress.devotionalDay ?? 0) + 1,
                            7,
                          ),
                        }).then((saved) => {
                          if (saved) {
                            saveToday(steps, true);
                            close();
                          }
                        })
                      }
                    />
                  ) : (
                    <Button
                      wide
                      title={c.markDone}
                      onPress={() => {
                        if (todayDevotional) saveToday([0, 1, 2], true);
                        close();
                      }}
                    />
                  )}
                </View>
              </View>
            )}
            {detail !== null && !planIntro && finished === null && (
              <View style={s.sheetFooter}>
                <View style={s.grow}>
                  <Button
                    wide
                    title={
                      progress.active !== detail
                        ? c.start
                        : planDone(detail)
                          ? c.completePlan
                          : c.markDay.replace("{day}", String(planDay(detail)))
                    }
                    loading={saving}
                    disabled={
                      !progressReady ||
                      !owner ||
                      loading ||
                      readError ||
                      planDone(detail)
                    }
                    onPress={() => {
                      const done =
                        (progress.days[detail] ?? 0) +
                        (progress.active === detail ? 1 : 0);
                      void saveProgress({
                        ...progress,
                        active: detail,
                        days: { ...progress.days, [detail]: done },
                      }).then((saved) => {
                        if (!saved) return;
                        saveToday(steps, true);
                        setFinished(done);
                        sheetScroll.current?.scrollTo({
                          y: 0,
                          animated: false,
                        });
                      });
                    }}
                  />
                </View>
              </View>
            )}
            {detail !== null && !planIntro && finished !== null && (
              <View style={[s.sheetFooter, s.footerStack]}>
                <Button wide title={c.close} onPress={close} />
                {finished < readingPlanLength(detail) && (
                  <Button
                    secondary
                    title={c.readNext.replace("{day}", String(finished + 1))}
                    onPress={() => {
                      setFinished(null);
                      readPlanDay(detail);
                    }}
                  />
                )}
              </View>
            )}
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
  titleRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  date: { color: colors.muted, fontSize: 13 },
  proPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginBottom: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C9A45C99",
  },
  proText: {
    color: colors.goldInk,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  segment: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  segmentActive: { backgroundColor: colors.green },
  segmentText: { color: colors.muted, fontSize: 14, fontWeight: "500" },
  segmentTextActive: { color: colors.paper, fontWeight: "600" },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 8 },
  quote: {
    gap: 4,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#C9A45C38",
  },
  quoteText: {
    color: colors.ink,
    fontFamily: serif,
    fontStyle: "italic",
    fontSize: 19,
    lineHeight: 27,
  },
  quoteRef: { color: colors.muted, fontSize: 12 },
  steps: { flexDirection: "row", gap: 8 },
  step: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C9A45C66",
  },
  stepDone: { backgroundColor: colors.gold, borderColor: colors.gold },
  stepRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  stepText: { color: colors.ink, fontSize: 14 },
  stepTextDone: { color: colors.paper, fontWeight: "600" },
  continue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  cover: {
    width: 54,
    height: 68,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pale,
    borderWidth: 1,
    borderColor: "#C9A45C59",
  },
  coverSmall: { width: 42, height: 52 },
  small: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  bar: {
    height: 4,
    marginTop: 6,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#F4EBDA1F",
  },
  barFill: { height: 4, backgroundColor: colors.gold },
  go: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
  },
  suggestion: { flexDirection: "row", alignItems: "center", gap: 12 },
  list: {
    borderRadius: 20,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  activeStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C9A45C59",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F4EBDA38",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.ink, fontSize: 13 },
  devotionalPlan: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
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
  text: { color: colors.ink, fontSize: 15 },
  gold: { color: colors.goldInk, fontSize: 13, letterSpacing: 0.5 },
  title: { color: colors.ink, fontSize: 17, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  plan: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: 19,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  planActive: { borderColor: colors.gold },
  planSpacer: { backgroundColor: "transparent" },
  planTitle: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  anchor: { gap: 12 },
  passagePill: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C9A45C73",
  },
  anchorText: {
    color: colors.ink,
    fontFamily: serif,
    fontSize: 23,
    lineHeight: 34,
  },
  toolGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toolTile: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 72,
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  toolText: { color: colors.ink, fontSize: 13 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  textLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
  },
  grow: { flex: 1 },
  keep: { flexShrink: 0 },
  shrink: { flexShrink: 1 },
  shade: { flex: 1, justifyContent: "flex-end", backgroundColor: "#0A0806A6" },
  sheet: {
    maxHeight: "90%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "#C9A45C4D",
    backgroundColor: colors.paper,
  },
  sheetTall: { height: "90%" },
  sheetScroll: { flexShrink: 1 },
  grab: {
    alignSelf: "center",
    width: 40,
    height: 4,
    marginTop: 10,
    borderRadius: 2,
    backgroundColor: "#F4EBDA40",
  },
  sheetContent: { padding: 22, paddingBottom: 32, gap: 20 },
  sheetFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  footerStack: { flexDirection: "column", alignItems: "stretch", gap: 4 },
  stepper: { flexDirection: "row", gap: 6 },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F4EBDA26",
  },
  stepBarOn: { backgroundColor: colors.gold },
  finished: { alignItems: "center", gap: 14, paddingVertical: 24 },
  finishedMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold,
  },
  passage: { gap: 14 },
  chapterLabel: { color: colors.goldInk, fontSize: 13, letterSpacing: 0.5 },
  verseNumber: {
    color: colors.goldInk,
    fontFamily: undefined,
    fontSize: 13,
    lineHeight: 35,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 4,
  },
  weekDays: { flexDirection: "row", gap: 6 },
  weekDay: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F4EBDA2E",
  },
  weekDayDone: { backgroundColor: colors.gold, borderColor: colors.gold },
  weekToday: { borderColor: colors.goldInk },
  weekLetter: { color: colors.muted, fontSize: 12 },
  section: { gap: 6 },
  sectionLabel: {
    color: colors.goldInk,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reflectText: {
    color: colors.ink,
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 35,
  },
  prayer: {
    color: colors.green,
    fontFamily: serif,
    fontStyle: "italic",
    fontSize: 27,
    lineHeight: 40,
    paddingVertical: 12,
  },
  actionText: {
    color: colors.ink,
    fontFamily: serif,
    fontSize: 21,
    lineHeight: 31,
  },
  reading: {
    fontFamily: serif,
    fontSize: 23,
    lineHeight: 35,
    color: colors.ink,
  },
});
