import { setStudyDiscussionTopic } from "../lib/study-discussion-draft";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { Body, Button, External, colors, serif } from "./quiet-ui";
import studyWorkspaceCopy from "../lib/pro-study-preview.json";
import ChapterWindow from "./ChapterWindow";
import {
  getReadingVerse,
  ensureCollection,
  studyFor,
  getBook,
  readingLocation,
  chapterSource,
  discussionVerseId,
  collections,
  type CollectionId,
} from "../lib/bible";
import type { Language } from "../lib/content";
import {
  journalScripture,
  journalStudyReference,
  themeReferenceFor,
} from "../lib/journal-verse-reference";
import {
  journalVerseStudy,
  type JournalVerseStudy,
} from "../lib/journal-verse-studies";
import { translatedStudy } from "../lib/bible-study-translations";
import { useApp } from "../lib/state";
import { fromVerseRoute, toVerseRoute } from "../lib/verse-route";
import { q } from "../lib/quiet-copy";
import { useReducedMotion } from "../lib/use-reduced-motion";
import {
  fetchOpenStudyNotes,
  type OpenStudyNote,
  type OpenStudyNotes,
} from "../lib/open-study-notes";
type Layer = "simple" | "deeper" | "theology" | "sources";
// The fuller study notes add these to the basic explanation. Every claim in
// them is drawn from the sources they list.
interface RichStudy {
  words?: { term: string; original: string; meaning: string }[];
  echoes?: { reference: string; text?: string; note?: string }[];
  teaching?: { title: string; text: string }[];
  differences?: { title: string; text: string }[];
  sources?: { label: string; url?: string }[];
}
// A sourced journal note in the shape the screen shows: related verses are
// read from the reader's own Bible (Greek/Latin Psalm numbers included).
function journalRich(
  note: JournalVerseStudy | undefined,
  collection: CollectionId | undefined,
  language: Language,
): RichStudy | undefined {
  if (!note?.sources?.length) return undefined;
  const fallbackBook: Partial<Record<Language, CollectionId>> = {
    en: "web",
    pt: "blivre",
    es: "rv1909",
    ru: "synodal",
  };
  const echoes = note.echoes?.map((echo) => {
    const own =
      collection === "dra" ||
      collection === "brenton" ||
      collection === "synodal"
        ? (echo[collection] ?? echo.ref)
        : echo.ref;
    const found = collection ? getReadingVerse(`${collection}:${own}`) : null;
    if (found) return { reference: found.reference, text: found.text };
    // Passage-only Bibles: name the verse in the reader's language.
    const [code, chapter, number] = echo.ref.split(".");
    const books = collections[fallbackBook[language] ?? "web"].index.books;
    const name = books.find((b) => b.code === code)?.name ?? code;
    return { reference: `${name} ${chapter}:${number}` };
  });
  return {
    words: note.words?.length ? note.words : undefined,
    echoes: echoes?.length ? echoes : undefined,
    teaching: note.teaching?.length ? note.teaching : undefined,
    differences: note.differences?.length ? note.differences : undefined,
    sources: [
      ...note.sources,
      ...(language === "en"
        ? []
        : [{ label: translatedNote[language] ?? translatedNote.pt ?? "" }]),
    ],
  };
}
const translatedNote: Partial<Record<Language, string>> = {
  pt: "Resumido a partir das edições em inglês listadas acima.",
  es: "Resumido a partir de las ediciones en inglés indicadas arriba.",
  ru: "Пересказано по английским изданиям, перечисленным выше.",
};
function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text selectable style={s.prose}>
      {children}
    </Text>
  );
}
function Section({
  title,
  children,
  tint = false,
}: {
  title: string;
  children: React.ReactNode;
  tint?: boolean;
}) {
  return (
    <View style={[s.section, tint && s.callout]}>
      <Text accessibilityRole="header" style={s.sectionTitle}>
        {title}
      </Text>
      {typeof children === "string" ? (
        children
          .split("\n\n")
          .map((paragraph, i) => <Paragraph key={i}>{paragraph}</Paragraph>)
      ) : (
        <Paragraph>{children}</Paragraph>
      )}
    </View>
  );
}
function Heading({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={s.sectionTitle}>
      {children}
    </Text>
  );
}
// A source title is shown only when it is a short passage reference: some
// translated rows carry a pasted passage or a machine-translation refusal.
function noteTitle(title: string) {
  return (
    !!title &&
    title.length <= 60 &&
    !title.includes("\n") &&
    !/lo siento|no puedo|i'?m sorry|desculpe|não posso|извините/i.test(title)
  );
}
function SourcedStudyNote({
  note,
  heading,
  lang,
}: {
  note: OpenStudyNote;
  heading: string;
  lang: Language;
}) {
  const source =
    note.source === "aquifer"
      ? {
          label:
            "Aquifer Open Study Notes · Tyndale / Mission Mutual · CC BY-SA 4.0",
          url: "https://github.com/BibleAquifer/AquiferOpenStudyNotes",
        }
      : {
          label:
            "Biblica Study Notes · Biblica / Mission Mutual · CC BY-SA 4.0",
          url: "https://github.com/BibleAquifer/BiblicaStudyNotes",
        };
  const notice = {
    en: "A study reference; Christian traditions may interpret the passage differently.",
    pt: "Uma referência de estudo; diferentes tradições cristãs podem interpretar a passagem de outra forma.",
    es: "Una referencia de estudio; las tradiciones cristianas pueden interpretar el pasaje de otra manera.",
    ru: "Заметки отражают взгляды авторов; христианские традиции могут толковать их иначе.",
  }[lang];
  const reviewNotice = {
    en: "The source does not specify a professional review of this translation.",
    pt: "A fonte não informa se esta tradução teve revisão profissional.",
    es: "La fuente no indica si esta traducción tuvo una revisión profesional.",
    ru: "Источник не указывает, была ли профессиональная проверка перевода.",
  }[lang];
  return (
    <>
      <Section
        title={noteTitle(note.title) ? `${heading} · ${note.title}` : heading}
      >
        {note.text}
      </Section>
      <Sources
        title=""
        sources={[
          source,
          { label: notice },
          ...(note.reviewLevel === "Professional"
            ? []
            : [{ label: reviewNotice }]),
          {
            label: "CC BY-SA 4.0",
            url: "https://creativecommons.org/licenses/by-sa/4.0/",
          },
        ]}
      />
    </>
  );
}

// The words of the verse in their first language, each with what it means.
function KeyWords({
  title,
  words,
}: {
  title: string;
  words: NonNullable<RichStudy["words"]>;
}) {
  return (
    <View style={s.section}>
      <Heading>{title}</Heading>
      <View style={s.list}>
        {words.map((word) => (
          <View key={word.term} style={s.word}>
            <Text style={s.wordTerm}>{word.term}</Text>
            <Text style={s.wordOriginal}>{word.original}</Text>
            <Text selectable style={s.note}>
              {word.meaning}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
// Other places in Scripture that take this verse up.
function Echoes({
  title,
  echoes,
}: {
  title: string;
  echoes: NonNullable<RichStudy["echoes"]>;
}) {
  return (
    <View style={s.section}>
      <Heading>{title}</Heading>
      <View style={s.list}>
        {echoes.map((echo) => (
          <View key={echo.reference} style={s.echo}>
            <Text style={s.label}>{echo.reference}</Text>
            {!!echo.text && (
              <Text selectable style={s.echoText}>
                {echo.text}
              </Text>
            )}
            {!!echo.note && (
              <Text selectable style={s.note}>
                {echo.note}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
function Points({
  points,
  tint = false,
}: {
  points: { title: string; text: string }[];
  tint?: boolean;
}) {
  return (
    <View style={[s.list, tint && s.callout]}>
      {points.map((point) => (
        <View key={point.title} style={{ gap: 7 }}>
          <Text accessibilityRole="header" style={s.pointTitle}>
            {point.title}
          </Text>
          <Text selectable style={tint ? s.note : s.prose}>
            {point.text}
          </Text>
        </View>
      ))}
    </View>
  );
}
function Sources({
  title,
  sources,
}: {
  title: string;
  sources: NonNullable<RichStudy["sources"]>;
}) {
  return (
    <View style={s.sources}>
      {!!title && (
        <Text accessibilityRole="header" style={s.label}>
          {title}
        </Text>
      )}
      {sources.map((source) =>
        source.url ? (
          <Text
            key={source.label}
            accessibilityRole="link"
            onPress={() => {
              if (/^https:\/\//.test(source.url ?? ""))
                void Linking.openURL(source.url ?? "");
            }}
            style={s.source}
          >
            {source.label} <Text style={s.sourceLink}>↗</Text>
          </Text>
        ) : (
          <Text key={source.label} style={s.source}>
            {source.label}
          </Text>
        ),
      )}
    </View>
  );
}
// A suggestion for the reader, not part of the explanation: a small card with
// its own label, so it reads as "your turn" rather than more commentary.
function Invitation({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.invitation}>
      <View style={s.invitationHead}>
        <Ionicons name="leaf-outline" size={15} color={colors.goldInk} />
        <Text accessibilityRole="header" style={s.invitationLabel}>
          {title}
        </Text>
      </View>
      <Text selectable style={s.invitationText}>
        {children}
      </Text>
    </View>
  );
}
export default function VerseStudy() {
  // "journal" is the theme verse reference a saved journal entry passes along.
  const {
    id: route,
    journal,
    panel,
  } = useLocalSearchParams<{
    id: string;
    journal?: string;
    panel?: string;
  }>();
  // Addresses use "~" in place of ":" (see verse-route); old links still work.
  const id = fromVerseRoute(route);
  const tr = useInterfaceCopy();
  const collection = readingLocation(id)?.collection;
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
        <Button
          title={tr("Back")}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)/bible")
          }
        />
        <Body>
          {tr(
            failedCollection === collection
              ? "Could not load this Bible."
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
    <StudyPage
      key={`${id}:${panel ?? ""}`}
      id={id}
      journal={journal}
      panel={panel}
    />
  );
}
export function StudyPage({
  id,
  journal,
  panel,
  onPanelClose,
}: {
  id: string;
  journal?: string;
  panel?: string;
  onPanelClose?: () => void;
}) {
  const tr = useInterfaceCopy();
  const { profile } = useApp(),
    lang = profile.language;
  const [layer, setLayer] = useState<Layer | null>(() =>
    ["deeper", "theology", "sources"].includes(panel ?? "")
      ? (panel as Layer)
      : null,
  );
  const closePanel = () => {
    if (onPanelClose) onPanelClose();
    else setLayer(null);
  };
  const [chapterOpen, setChapterOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [notesAttempt, setNotesAttempt] = useState(0);
  const [loadedNotes, setLoadedNotes] = useState<{
    key: string;
    notes: OpenStudyNotes | null;
    unavailable: boolean;
  } | null>(null);
  const notesKey = `${id}:${lang}:${notesAttempt}`;
  const notesLoading = loadedNotes?.key !== notesKey;
  const ownNotes = notesLoading ? null : loadedNotes.notes;
  // When the reader's language has nothing for this verse, an English note may.
  const [englishNotes, setEnglishNotes] = useState<{
    key: string;
    notes: OpenStudyNotes | null;
  } | null>(null);
  const [showEnglish, setShowEnglish] = useState(false);
  const notesUnavailable = !notesLoading && loadedNotes.unavailable;
  useEffect(() => {
    let active = true;
    void fetchOpenStudyNotes(id, lang)
      .then((notes) => {
        if (active)
          setLoadedNotes({ key: notesKey, notes, unavailable: false });
      })
      .catch(() => {
        if (active)
          setLoadedNotes({ key: notesKey, notes: null, unavailable: true });
      });
    return () => {
      active = false;
    };
  }, [id, lang, notesKey]);
  const reducedMotion = useReducedMotion();
  const location = readingLocation(id);
  // Trust the journal's reference only when this is that theme verse here.
  const journalReference = journalStudyReference(id, journal);
  const verse =
    getReadingVerse(id) ??
    (journalReference && location
      ? journalScripture(location.collection, journalReference)
      : null);
  const study = lang === "en" ? studyFor(id) : undefined;
  // Journal verses are explained in every language; other studies are English.
  // A journal theme verse has a note in every language; once that note is
  // rebuilt from sources it is preferred, wherever the verse is opened.
  // Studies written in English only have their own translations.
  const journalNote =
    journalVerseStudy(journalReference ?? themeReferenceFor(id), lang) ??
    translatedStudy(id, lang);
  const sourced = journalNote?.sources?.length ? journalNote : undefined;
  const explanation = sourced ?? study ?? journalNote;
  const ownNotesFound = !!(ownNotes?.detail || ownNotes?.overview);
  const lookForEnglish =
    lang !== "en" &&
    !explanation &&
    !notesLoading &&
    !notesUnavailable &&
    !ownNotesFound;
  useEffect(() => {
    if (!lookForEnglish) return;
    let active = true;
    void fetchOpenStudyNotes(id, "en")
      .then((notes) => {
        if (active) setEnglishNotes({ key: id, notes });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id, lookForEnglish]);
  const english = englishNotes?.key === id ? englishNotes.notes : null;
  const englishAvailable =
    lookForEnglish && !!(english?.detail || english?.overview);
  const openNotes = showEnglish && englishAvailable ? english : ownNotes;
  const englishOffer = {
    en: "",
    pt: "Este versículo ainda não tem explicação em português, mas há uma em inglês.",
    es: "Este versículo aún no tiene explicación en español, pero hay una en inglés.",
    ru: "Для этого стиха пока нет объяснения на русском, но есть на английском.",
  }[lang];
  const showInEnglish = {
    en: "",
    pt: "Mostrar em inglês",
    es: "Mostrar en inglés",
    ru: "Показать на английском",
  }[lang];
  const openHeading = {
    en: "Study note",
    pt: "Nota de estudo",
    es: "Nota de estudio",
    ru: "Учебное примечание",
  }[lang];
  const overviewHeading = {
    en: "Passage context",
    pt: "Contexto da passagem",
    es: "Contexto del pasaje",
    ru: "Контекст отрывка",
  }[lang];
  const loadingLabel = {
    en: "Loading study notes…",
    pt: "Carregando notas de estudo…",
    es: "Cargando notas de estudio…",
    ru: "Загрузка примечаний…",
  }[lang];
  const unavailableLabel = {
    en: "Study notes could not load. Check your connection and try again.",
    pt: "Não foi possível carregar as notas. Verifique sua conexão e tente novamente.",
    es: "No se pudieron cargar las notas. Comprueba tu conexión e inténtalo de nuevo.",
    ru: "Не удалось загрузить примечания. Проверьте подключение и попробуйте снова.",
  }[lang];
  // The deeper tabs wait for, or explain, missing study notes too, so a
  // note never appears late or silently fails to appear.
  const notesStatus = explanation ? null : notesLoading ? (
    <Body small>{loadingLabel}</Body>
  ) : notesUnavailable ? (
    <>
      <Body small>{unavailableLabel}</Body>
      <Button
        secondary
        title={tr("Try again")}
        onPress={() => setNotesAttempt((n) => n + 1)}
      />
    </>
  ) : null;
  const rich: RichStudy =
    (sourced && journalRich(sourced, verse?.collection, lang)) ?? study ?? {};
  if (!verse)
    return (
      <SafeAreaView style={s.safe}>
        <Button
          title={tr("Back")}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)/bible")
          }
        />
        <Body>{tr("This passage is unavailable.")}</Body>
      </SafeAreaView>
    );
  const book = location ? getBook(location.code, location.collection) : null,
    chapterVerses = location
      ? book?.chapters[String(location.chapter)]
      : undefined;
  const selectedNumber = chapterVerses?.find(
    (v) =>
      id === v.id ||
      id.endsWith(":" + v.id) ||
      id.endsWith("." + v.number) ||
      id.endsWith("-" + v.number),
  )?.number;
  const psalmNumbering = [
    "brenton-psalm-33-19",
    "dra-psalm-33-19",
    "brenton:PSA.33.19",
    "dra:PSA.33.19",
  ].includes(id)
    ? tr("Psalm 33 in this edition; Psalm 34 in Hebrew numbering.")
    : study?.editionId === "brenton" && location?.code === "PSA"
      ? tr("Psalm numbers follow the Septuagint edition shown above.")
      : "";
  const question =
    explanation?.question ??
    tr("What do I notice here, and what question will I carry with me?");
  const sourceContent = (
    <View style={{ gap: 14 }}>
      {notesStatus}
      {openNotes?.detail && (
        <SourcedStudyNote
          note={openNotes.detail}
          heading={openHeading}
          lang={lang}
        />
      )}
      {openNotes?.overview && (
        <SourcedStudyNote
          note={openNotes.overview}
          heading={overviewHeading}
          lang={lang}
        />
      )}
      {rich.sources && <Sources title={tr("Sources")} sources={rich.sources} />}
      {verse.notes.map((note, i) => (
        <Body small key={i}>
          {note}
        </Body>
      ))}
      <Body small>
        {study
          ? tr(
              "Editorial reflections, separate from Scripture, in English and awaiting theological review. They cover only the passages named and are not endorsed by a church.",
            )
          : explanation
            ? tr(
                "Editorial reflections for this verse, separate from Scripture. They await theological review and are not endorsed by a church.",
              )
            : q(lang, "studyLimited")}
      </Body>
      {!!psalmNumbering && <Body small>{psalmNumbering}</Body>}
      <External title={tr("Read the source passage")} url={verse.sourceUrl} />
      {study?.guide && (
        <External
          title={tr("Further reading at BibleProject")}
          url={study.guide}
        />
      )}
      <Body small>{verse.attribution}</Body>
      <External title={tr("License and attribution")} url={verse.licenseUrl} />
    </View>
  );
  const options = [
    {
      id: "simple" as const,
      icon: "leaf-outline" as const,
      hint: tr("A gentle place to begin"),
    },
    {
      id: "deeper" as const,
      icon: "layers-outline" as const,
      hint: tr("Context, meaning and daily life"),
    },
  ];
  const readingPanel = (
    <Modal
      visible={layer !== null}
      transparent
      animationType={reducedMotion ? "none" : "slide"}
      onRequestClose={closePanel}
    >
      <View style={s.backdrop}>
        <SafeAreaView style={s.sheet} edges={["bottom"]}>
          <View style={s.sheetHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr("Back to study options")}
              onPress={closePanel}
              style={s.back}
            >
              <Ionicons name="chevron-back" size={20} color={colors.ink} />
              <Text style={s.backText}>{tr("Back")}</Text>
            </Pressable>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.sheetMode}>
                {layer === "sources"
                  ? tr("Sources and study notes")
                  : layer
                    ? q(lang, layer)
                    : ""}
              </Text>
              <Text style={s.sheetReference}>{verse.reference}</Text>
            </View>
          </View>
          <ScrollView
            key={layer ?? "closed"}
            contentContainerStyle={s.reading}
            testID="study-reading-panel"
          >
            <View style={s.readingQuote}>
              <Text selectable style={s.smallQuote}>
                {verse.text || tr("Publisher note")}
              </Text>
              <Text style={s.edition}>{verse.editionName}</Text>
            </View>
            {layer === "sources" ? (
              sourceContent
            ) : layer === "simple" ? (
              <>
                {explanation?.simple ? (
                  <Section title={tr("In simple words")}>
                    {explanation.simple}
                  </Section>
                ) : openNotes?.detail || openNotes?.overview ? (
                  <SourcedStudyNote
                    note={(openNotes.overview ?? openNotes.detail)!}
                    heading={openNotes.overview ? overviewHeading : openHeading}
                    lang={lang}
                  />
                ) : notesLoading ? (
                  <Body small>{loadingLabel}</Body>
                ) : notesUnavailable ? (
                  <>
                    <Body small>{unavailableLabel}</Body>
                    <Button
                      secondary
                      title={tr("Try again")}
                      onPress={() => setNotesAttempt((n) => n + 1)}
                    />
                  </>
                ) : (
                  <>
                    <Section title={tr("In simple words")}>
                      {englishAvailable
                        ? englishOffer
                        : tr(
                            "There’s no explanation for this verse yet, but one is coming soon. Meanwhile, read the lines around it and notice who speaks, what happens and which words repeat.",
                          )}
                    </Section>
                    {englishAvailable && (
                      <Button
                        secondary
                        title={showInEnglish}
                        onPress={() => setShowEnglish(true)}
                      />
                    )}
                  </>
                )}
                {!explanation &&
                  !openNotes?.detail &&
                  !openNotes?.overview &&
                  verse.context && (
                    <Paragraph>
                      {verse.context[lang] ?? verse.context.en}
                    </Paragraph>
                  )}
                <Invitation title={tr("A small response")}>
                  {explanation?.today ??
                    tr(
                      "Choose one word or image that stays with you. Sit with it before deciding what it means for your life.",
                    )}
                </Invitation>
              </>
            ) : layer === "deeper" ? (
              <>
                {notesStatus}
                {(explanation ||
                  (!openNotes?.detail && !openNotes?.overview)) && (
                  <Section title={tr("The story around these words")}>
                    {explanation?.context ??
                      verse.context?.[lang] ??
                      verse.context?.en ??
                      tr(
                        "Read the whole chapter. Is it a story, song, letter, law or vision? How does this verse fit in?",
                      )}
                  </Section>
                )}
                {!!psalmNumbering && <Body small>{psalmNumbering}</Body>}
                {!!rich.words && (
                  <KeyWords title={tr("Key words")} words={rich.words} />
                )}
                {(explanation ||
                  (!openNotes?.detail && !openNotes?.overview)) && (
                  <Section title={tr("What it means")} tint>
                    {explanation?.meaning ??
                      tr(
                        "Look for repeated words, contrasts and changes of speaker. Read a hard line in light of the whole passage. These are reading prompts, not a commentary.",
                      )}
                  </Section>
                )}
                {englishAvailable && !showEnglish && (
                  <>
                    <Body small>{englishOffer}</Body>
                    <Button
                      secondary
                      title={showInEnglish}
                      onPress={() => setShowEnglish(true)}
                    />
                  </>
                )}
                {openNotes?.detail && (
                  <SourcedStudyNote
                    note={openNotes.detail}
                    heading={openHeading}
                    lang={lang}
                  />
                )}
                {openNotes?.overview && (
                  <SourcedStudyNote
                    note={openNotes.overview}
                    heading={overviewHeading}
                    lang={lang}
                  />
                )}
                {!!rich.echoes && (
                  <Echoes
                    title={tr("Where Scripture picks this up")}
                    echoes={rich.echoes}
                  />
                )}
                <Invitation title={tr("In everyday life")}>
                  {explanation?.today ??
                    tr(
                      "What response might fit the whole passage? Keep what the text says apart from what it brings to mind. A question can stay open for a while.",
                    )}
                </Invitation>
              </>
            ) : layer === "theology" ? (
              <>
                {notesStatus}
                <Text accessibilityRole="header" style={s.sectionTitle}>
                  {explanation
                    ? tr("What this says about God")
                    : tr("Questions about God and faith")}
                </Text>
                {rich.teaching ? (
                  <Points points={rich.teaching} />
                ) : (
                  (
                    explanation?.theology ??
                    tr(
                      "What does this passage say about God, people, and their relationship? What is being promised, asked, or questioned?\n\nRead the surrounding passage before drawing a conclusion. Christians may read difficult passages differently.",
                    )
                  )
                    .split("\n\n")
                    .map((paragraph, i) => (
                      <Paragraph key={i}>{paragraph}</Paragraph>
                    ))
                )}
                {!explanation && openNotes?.detail && (
                  <SourcedStudyNote
                    note={openNotes.detail}
                    heading={openHeading}
                    lang={lang}
                  />
                )}
                {!!rich.differences && (
                  <>
                    <Heading>{tr("Where Christians differ")}</Heading>
                    <Points points={rich.differences} tint />
                  </>
                )}
                <Invitation title={tr("A question to carry")}>
                  {question}
                </Invitation>
              </>
            ) : null}
            {!!rich.sources && (
              <Sources title={tr("Sources")} sources={rich.sources} />
            )}
            <Body small>
              {explanation || openNotes?.detail || openNotes?.overview
                ? tr(
                    "A Christian reflection, separate from Scripture. Traditions may understand some details differently.",
                  )
                : q(lang, "studyLimited")}
            </Body>
            <StudyDiscussionActions
              id={id}
              reference={verse.reference}
              beforeNavigate={closePanel}
            />
            <Button
              secondary
              title={tr("Back to study options")}
              onPress={closePanel}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
  if (onPanelClose) return readingPanel;
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <View style={s.topbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr("Back")}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)/bible")
          }
          style={s.back}
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
          <Text style={s.backText}>{tr("Back")}</Text>
        </Pressable>
        <Text style={s.eyebrow}>{tr("BIBLE STUDY")}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr("Home")}
          onPress={() => router.dismissTo("/(tabs)")}
          style={s.home}
        >
          <Ionicons name="home-outline" size={22} color={colors.ink} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.page}>
        <View style={s.headingGroup}>
          <Text accessibilityRole="header" style={s.reference}>
            {verse.reference}
          </Text>
          <Text style={s.edition}>{verse.editionName}</Text>
        </View>
        <View style={s.verseCard}>
          {verse.text ? (
            <Text selectable style={s.quote}>
              {verse.text}
            </Text>
          ) : (
            <Body>{tr("Publisher note")}</Body>
          )}
          <View style={s.goldLine} />
          {chapterVerses && (
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: chapterOpen }}
                onPress={() => setChapterOpen(!chapterOpen)}
                style={s.footnoteLink}
              >
                <Text style={s.chapterLink}>{tr("Read full chapter")}</Text>
                <Ionicons
                  name={chapterOpen ? "chevron-up" : "arrow-forward"}
                  size={16}
                  color={colors.goldInk}
                />
              </Pressable>
              {chapterOpen && (
                <View style={{ gap: 18, paddingTop: 12 }}>
                  <ChapterWindow
                    title={`${book?.book.name} ${location?.chapter}`}
                    verses={chapterVerses}
                    selectedNumber={selectedNumber}
                  />
                  {location && (
                    <External
                      title={tr("Chapter source")}
                      url={chapterSource(
                        location.code,
                        location.chapter,
                        location.collection,
                      )}
                    />
                  )}
                </View>
              )}
            </View>
          )}
        </View>
        <View style={s.options}>
          {options.map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={q(lang, option.id)}
              onPress={() => setLayer(option.id)}
              style={({ pressed }) => [
                s.option,
                pressed && { backgroundColor: colors.pale },
              ]}
            >
              <View style={s.optionIcon}>
                <Ionicons name={option.icon} size={23} color={colors.goldInk} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={s.optionTitle}>{q(lang, option.id)}</Text>
                <Text style={s.optionHint}>{option.hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
        <StudyDiscussionActions id={id} reference={verse.reference} />
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/pro",
              params: { verse: toVerseRoute(id), tab: "2" },
            })
          }
          style={s.proEntry}
        >
          <Ionicons name="sparkles" size={27} color={colors.goldInk} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.optionTitle}>{studyWorkspaceCopy[lang].words}</Text>
            <Text style={s.optionHint}>{studyWorkspaceCopy[lang].proHint}</Text>
          </View>
          <Text style={s.proTag}>PRO</Text>
          <Ionicons name="chevron-forward" size={19} color={colors.goldInk} />
        </Pressable>
        <View style={s.further}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: sourcesOpen }}
            onPress={() => setSourcesOpen(!sourcesOpen)}
            style={s.footnoteLink}
          >
            <Text style={s.footnoteText}>{tr("Sources and study notes")}</Text>
            <Ionicons
              name={sourcesOpen ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.muted}
            />
          </Pressable>
          {sourcesOpen && sourceContent}
        </View>
      </ScrollView>
      {readingPanel}
    </SafeAreaView>
  );
}
function StudyDiscussionActions({
  id,
  reference,
  beforeNavigate,
}: {
  id: string;
  reference: string;
  beforeNavigate?: () => void;
}) {
  const tr = useInterfaceCopy();
  return (
    <View>
      <StudyAction
        icon="people-outline"
        title={tr("Open a public discussion")}
        onPress={() => {
          setStudyDiscussionTopic(reference);
          beforeNavigate?.();
          router.push({
            pathname: "/community",
            params: {
              compose: "1",
              verse: discussionVerseId(id) ?? undefined,
            },
          });
        }}
      />
    </View>
  );
}
function StudyAction({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.option,
        pressed && { backgroundColor: colors.pale },
      ]}
    >
      <View style={s.optionIcon}>
        <Ionicons name={icon} size={23} color={colors.goldInk} />
      </View>
      <Text style={[s.optionTitle, { flex: 1 }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}
const s = StyleSheet.create({
  proEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 22,
    borderRadius: 20,
    backgroundColor: colors.pale,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  proTag: {
    color: colors.goldInk,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  safe: { flex: 1, backgroundColor: colors.paper },
  page: {
    padding: 22,
    paddingBottom: 45,
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: 22,
  },
  home: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 44,
    paddingRight: 15,
  },
  backText: { fontSize: 16, color: colors.ink },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.8,
    color: colors.goldInk,
    lineHeight: 18,
  },
  headingGroup: { gap: 9, marginBottom: 22 },
  reference: {
    fontFamily: serif,
    fontSize: 31,
    lineHeight: 40,
    color: colors.ink,
  },
  edition: { fontSize: 11, lineHeight: 18, color: colors.muted },
  verseCard: {
    padding: 24,
    borderWidth: 1,
    borderColor: "#B28A3E35",
    borderRadius: 24,
    backgroundColor: colors.white,
    gap: 22,
  },
  quote: { fontFamily: serif, fontSize: 27, lineHeight: 41, color: colors.ink },
  goldLine: { width: 30, height: 2, backgroundColor: colors.gold },
  options: { marginTop: 22, marginBottom: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    minHeight: 84,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
  },
  optionIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.pale,
  },
  optionTitle: { fontSize: 20, lineHeight: 27, color: colors.ink },
  optionHint: { fontSize: 12, lineHeight: 19, color: colors.muted },
  further: { marginTop: 30, gap: 10 },
  footnoteLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    alignSelf: "flex-start",
  },
  chapterLink: { fontSize: 13, lineHeight: 20, color: colors.goldInk },
  footnoteText: { fontSize: 12, lineHeight: 19, color: colors.muted },
  question: {
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 35,
    color: colors.ink,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#000000AA",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "94%",
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
    backgroundColor: colors.paper,
    borderTopLeftRadius: 29,
    borderTopRightRadius: 29,
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 21,
    paddingBottom: 19,
    borderBottomWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  sheetMode: {
    fontSize: 11,
    letterSpacing: 1.1,
    color: colors.goldInk,
    textTransform: "uppercase",
  },
  sheetReference: {
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 32,
    color: colors.ink,
  },
  reading: { padding: 24, paddingBottom: 45, gap: 25 },
  readingQuote: {
    padding: 21,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 14,
  },
  smallQuote: {
    fontFamily: serif,
    fontSize: 23,
    lineHeight: 35,
    color: colors.ink,
  },
  section: { gap: 13 },
  sectionTitle: {
    fontFamily: serif,
    fontSize: 26,
    lineHeight: 34,
    color: colors.ink,
  },
  prose: { fontFamily: serif, fontSize: 18, lineHeight: 29, color: colors.ink },
  callout: { padding: 22, borderRadius: 21, backgroundColor: colors.pale },
  list: { gap: 18 },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.goldInk,
  },
  note: { fontSize: 16, lineHeight: 25, color: colors.ink },
  word: {
    gap: 5,
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: "#B28A3E8C",
  },
  wordTerm: {
    fontFamily: serif,
    fontSize: 21,
    lineHeight: 27,
    color: colors.ink,
  },
  wordOriginal: { fontSize: 14, lineHeight: 20, color: colors.goldInk },
  echo: { gap: 6 },
  echoText: {
    fontFamily: serif,
    fontStyle: "italic",
    fontSize: 19,
    lineHeight: 29,
    color: colors.ink,
  },
  pointTitle: {
    fontFamily: serif,
    fontSize: 21,
    lineHeight: 28,
    color: colors.ink,
  },
  sources: {
    gap: 9,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  source: { fontSize: 13, lineHeight: 19, color: colors.muted },
  sourceLink: { color: colors.goldInk, fontWeight: "700" },
  invitation: {
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#B28A3E66",
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  invitationHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  invitationLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.goldInk,
  },
  invitationText: { fontSize: 16, lineHeight: 24, color: colors.ink },
});
