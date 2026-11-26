import { requireProAction } from "../lib/membership";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Card, Body, Heading, colors, serif } from "./quiet-ui";
import { StudyAction, StudyHeader, StudyLink } from "./StudyControls";
import {
  devotionalCatalog,
  latestDevotionalForDate,
  devotionalArchive,
  localDevotionalDate,
  type DailyDevotional as Devotional,
} from "../lib/devotional-calendar";
import {
  devotionalHistory,
  recordDevotional,
  type DevotionalRead,
} from "../lib/devotional-history";
import {
  collections,
  ensureCollection,
  chapterRows,
  type ReadingVerse,
  type CollectionId,
} from "../lib/bible";
import type { Language } from "../lib/content";
import VerseNotes from "./VerseNotes";
import { useLocalDay } from "../lib/use-local-day";
import labels from "../lib/original-study-copy.json";
import studyCopy from "../lib/pro-study-preview.json";
import { useReducedMotion } from "../lib/use-reduced-motion";

export default function DailyDevotional({
  language,
  collection,
  onFinished,
  onReadCount,
}: {
  language: Language;
  collection: CollectionId | null;
  onFinished: () => void;
  onReadCount: Dispatch<SetStateAction<number>>;
}) {
  const c = labels[language],
    study = studyCopy[language];
  const date = localDevotionalDate(useLocalDay());
  const [history, setHistory] = useState<DevotionalRead[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [selected, setSelected] = useState<Devotional | null>(null);
  const [archive, setArchive] = useState(false);
  const [month, setMonth] = useState("");
  const [limit, setLimit] = useState(20);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [verse, setVerse] = useState<ReadingVerse | null>(null);
  const [verseError, setVerseError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reduced = useReducedMotion();
  const today = latestDevotionalForDate(date);
  const item = selected ?? today;
  useEffect(() => {
    let live = true;
    devotionalHistory()
      .then((rows) => {
        if (live) {
          setHistory(rows);
          onReadCount(rows.filter((row) => row.completedAt).length);
          setHistoryError(false);
        }
      })
      .catch(() => {
        if (live) setHistoryError(true);
      });
    return () => {
      live = false;
    };
  }, [attempt, onReadCount]);
  useEffect(() => {
    let live = true;
    if (!item) return;
    const [book, ch, v] = item.reference.split(".");
    // Daily readings use NT references shared by these editions. The actual
    // edition name stays visible. Never relabel a fallback as the chosen edition.
    const fallback: CollectionId = (
      { en: "web", pt: "blivre", es: "rv1909", ru: "synodal" } as const
    )[language];
    async function load() {
      for (const edition of [
        ...new Set(
          [collection, fallback].filter((id): id is CollectionId => !!id),
        ),
      ]) {
        await ensureCollection(edition);
        const b = collections[edition].index.books.findIndex(
          (row) => row.code === book,
        );
        const result = chapterRows(b, Number(ch), edition).find(
          (row) => Number(row.id.split(".").pop()) === Number(v),
        );
        if (result) {
          if (live) setVerse(result);
          return;
        }
      }
      throw Error("missing");
    }
    void load().catch(() => {
      if (live) setVerseError(true);
    });
    return () => {
      live = false;
    };
  }, [item, collection, language, attempt]);
  const record = async (entry: Devotional, bits = 0) => {
    const row = await recordDevotional(entry.id, bits);
    if (
      row.completedAt &&
      !history.some((old) => old.id === entry.id && old.completedAt)
    )
      onReadCount((count) => count + 1);
    setHistory((old) => [...old.filter((r) => r.id !== entry.id), row]);
    return row;
  };
  const open = (entry: Devotional, startStep = 0) => { void requireProAction(() => openUnlocked(entry, startStep)); };
  const openUnlocked = (entry: Devotional, startStep = 0) => {
    if (entry.id !== item?.id) {
      setVerse(null);
      setVerseError(false);
    }
    setSelected(entry);
    setStep(startStep);
    setSaveError(false);
    void record(entry).catch(() => setHistoryError(true));
  };
  const move = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      await record(selected, 1 << step);
      setStep(step + 1);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };
  const finish = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      await record(selected, 15);
      onFinished();
      setSelected(null);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };
  const months = [
    ...new Set(
      devotionalCatalog
        .filter((d) => d.date <= date || !d.approved)
        .map((d) => d.date.slice(0, 7)),
    ),
  ];
  const rows = devotionalArchive(
    date,
    month,
    devotionalCatalog.some((entry) => !entry.approved),
  );
  const read = (entry: Devotional) =>
    history.find((row) => row.id === entry.id);
  const showSources = useState(false);
  const footnote = showSources[0];
  const setFootnote = showSources[1];
  return (
    <View style={s.stack}>
      <Card>
        <Text style={s.eyebrow}>
          {study.daily}
          {today
            ? ` · ${new Intl.DateTimeFormat(language, { month: "short", day: "numeric" }).format(new Date(today.date + "T12:00:00"))}`
            : ""}
        </Text>
        {today ? (
          <>
            <Heading>{today[language][0]}</Heading>
            {!selected && verse && (
              <View
                style={{
                  borderLeftWidth: 2,
                  borderLeftColor: colors.gold,
                  paddingLeft: 14,
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontFamily: serif,
                    color: colors.ink,
                    fontSize: 22,
                    lineHeight: 33,
                  }}
                >
                  {verse.text}
                </Text>
                <Body small>
                  {verse.reference} · {verse.editionName}
                </Body>
              </View>
            )}
            <Body>{today[language][1]}</Body>
            <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              {[study.readStep, study.reflect, study.pray].map(
                (label, index) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    onPress={() => open(today, index)}
                    style={{ paddingVertical: 12 }}
                  >
                    <Text
                      style={{
                        color:
                          (read(today)?.steps ?? 0) & (1 << index)
                            ? colors.goldInk
                            : colors.muted,
                      }}
                    >
                      {(read(today)?.steps ?? 0) & (1 << index) ? "✓ " : ""}
                      {label}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
            {!today.approved && <Body small>{c.draft}</Body>}
            <StudyAction
              title={read(today)?.completedAt ? c.seen : study.open}
              onPress={() => open(today)}
            />
          </>
        ) : (
          <Body>{c.queueEnd}</Body>
        )}
      </Card>
      <StudyLink
        title={c.history}
        icon="time-outline"
        onPress={() => setArchive(true)}
      />
      {historyError && (
        <StudyAction
          secondary
          title={c.retry}
          onPress={() => {
            setVerseError(false);
            setAttempt(attempt + 1);
          }}
        />
      )}
      <Modal
        visible={archive}
        transparent
        animationType={reduced ? "none" : "slide"}
        onRequestClose={() => setArchive(false)}
      >
        <View style={s.shade}>
          <View style={s.sheet}>
            <StudyHeader
              title={c.history}
              closeLabel={c.close}
              onClose={() => setArchive(false)}
            />
            <ScrollView contentContainerStyle={s.stack}>
              <ScrollView horizontal>
                <View style={s.months}>
                  {["", ...months].map((value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: month === value }}
                      onPress={() => {
                        setMonth(value);
                        setLimit(20);
                      }}
                      style={s.month}
                    >
                      <Text
                        style={{
                          color:
                            month === value ? colors.goldInk : colors.muted,
                        }}
                      >
                        {value || c.all}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              {rows.slice(0, limit).map((entry) => (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setArchive(false);
                    open(entry);
                  }}
                  style={s.row}
                >
                  <Text style={s.eyebrow}>
                    {entry.date} ·{" "}
                    {read(entry)?.completedAt ? c.seen : c.unread}
                  </Text>
                  <Text style={s.title}>{entry[language][0]}</Text>
                </Pressable>
              ))}
              {rows.length > limit && (
                <StudyAction
                  secondary
                  title={c.more}
                  onPress={() => setLimit(limit + 20)}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!selected}
        transparent
        animationType={reduced ? "none" : "slide"}
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.shade}>
          <View style={s.sheet}>
            <StudyHeader
              title={selected?.[language][0] ?? study.daily}
              closeLabel={c.close}
              onClose={() => setSelected(null)}
            />
            <ScrollView contentContainerStyle={s.stack}>
              <Text style={s.eyebrow}>
                {selected?.date} ·{" "}
                {
                  [study.readStep, study.reflect, study.pray, study.action][
                    step
                  ]
                }
              </Text>
              {step === 0 &&
                (!verse && !verseError ? (
                  <ActivityIndicator color={colors.goldInk} />
                ) : verse ? (
                  <>
                    <Text style={s.scripture}>{verse.text}</Text>
                    <Body small>
                      {verse.reference} · {verse.editionName}
                    </Body>
                  </>
                ) : (
                  <>
                    <Body>{c.error}</Body>
                    <StudyAction
                      title={c.retry}
                      onPress={() => {
                        setVerseError(false);
                        setAttempt(attempt + 1);
                      }}
                    />
                  </>
                ))}
              {step === 1 && (
                <>
                  <Body>{selected?.[language][1]}</Body>
                  {selected && verse && (
                    <VerseNotes
                      verse={verse.id}
                      reference={verse.reference}
                      kind="devotional"
                      contextId={selected.id}
                      language={language}
                    />
                  )}
                </>
              )}
              {step === 2 && (
                <Body>
                  {selected?.[language][3] ??
                    {
                      en: "Speak to God in your own words, or spend a moment in silence.",
                      pt: "Converse com Deus com suas palavras ou fique um momento em silêncio.",
                      es: "Habla con Dios con tus palabras o pasa un momento en silencio.",
                      ru: "Обратитесь к Богу своими словами или побудьте немного в тишине.",
                    }[language]}
                </Body>
              )}
              {step === 3 && (
                <Card>
                  <Body>{selected?.[language][2]}</Body>
                </Card>
              )}
              {selected && !selected.approved && <Body small>{c.draft}</Body>}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: footnote }}
                onPress={() => setFootnote(!footnote)}
              >
                <Text style={s.eyebrow}>{study.sources} ⌄</Text>
              </Pressable>
              {footnote && (
                <>
                  <Body small>{study.originalDevotional}</Body>
                  {verse && <Body small>{verse.attribution}</Body>}
                </>
              )}
              {saveError && <Body>{c.saveError}</Body>}
            </ScrollView>
            <View style={s.footer}>
              {step > 0 && (
                <StudyAction
                  secondary
                  title={study.back}
                  onPress={() => setStep(step - 1)}
                />
              )}
              <StudyAction
                title={step === 3 ? c.complete : study.next}
                loading={saving}
                disabled={step === 0 && !verse}
                onPress={() => void (step === 3 ? finish() : move())}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  stack: { gap: 18, paddingBottom: 14 },
  shade: {
    flex: 1,
    backgroundColor: "#0009",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    backgroundColor: colors.paper,
    width: "100%",
    maxWidth: 720,
    height: "85%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    gap: 18,
  },
  eyebrow: { fontSize: 12, color: colors.muted, paddingVertical: 6 },
  months: { flexDirection: "row", gap: 10 },
  month: { padding: 12 },
  row: {
    gap: 5,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { fontSize: 22, fontFamily: serif, color: colors.ink },
  scripture: {
    fontSize: 27,
    fontFamily: serif,
    color: colors.ink,
    lineHeight: 39,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    gap: 10,
  },
});
