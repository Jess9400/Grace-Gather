import JournalGuidanceStatus from "../../components/JournalGuidanceStatus";
import JournalConversation from "../../components/JournalConversation";
import JournalActionButton from "../../components/JournalActionButton";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Heading,
  Body,
  Card,
  Button,
  Field,
  Notice,
  colors,
  serif,
} from "../../components/quiet-ui";
import { TextAction } from "../../components/CommunityControls";
import AudioPlayback from "../../components/QuietAudioPlayback";
import { useApp } from "../../lib/state";
import { useQuiet } from "../../lib/quiet-state";
import { copy, type JournalResponse } from "../../lib/content";
import { q } from "../../lib/quiet-copy";
import type { ReadingVerse } from "../../lib/bible";
import { resolveJournalResponse } from "../../lib/journal-response";
import { journalAction, journalTheme } from "../../lib/journal-guidance";
import { gathering } from "../../lib/gatherings";
import { confessionJournalTarget } from "../../lib/journal-navigation";
import { verseRouteId } from "../../lib/verse-route";
import { hasJournalGatheringTopic, matchingJournalGathering } from "../../lib/journal-gathering";
import {
  jc,
  journalActionCopy,
  displayedJournalInvitation,
  type JournalCopyKey,
} from "../../lib/journal-copy";

// One saved verse and one invitation, with replies inline beneath them.
export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, profile, saveEntry, saveJournalResponse } = useApp();
  const { update } = useQuiet();
  const entry = entries.find((e) => e.id === id);
  const [verse, setVerse] = useState<ReadingVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayResponse, setDisplayResponse] = useState<JournalResponse>();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteAction, setNoteAction] = useState<string>();
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [earlierOpen, setEarlierOpen] = useState(false);
  const lang = profile.language;
  useEffect(() => {
    let active = true;
    if (!entry) return;
    const e = entry;
    async function load() {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setVerse(null);
      const response = await resolveJournalResponse(e, profile);
      if (!e.response && (response.verse || e.safety)) {
        try {
          await saveJournalResponse(e.id, response);
        } catch {
          if (active) setNotice(copy(lang, "storageError"));
        }
      }
      if (active) {
        setVerse(response.verse);
        setDisplayResponse(response);
        setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
    // The original response is independent of later chat messages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, entry?.response]);
  if (!entry)
    return (
      <Screen back>
        <Body>{copy(lang, "emptySub")}</Body>
      </Screen>
    );
  const action = displayResponse?.actionId ?? (entry.response?.actionId === "A25" ? "A08" : entry.response?.actionId) ?? journalAction(entry, profile);
  const actionCopy = journalActionCopy(lang, journalTheme(entry).id, action);
  const actionTitle = displayResponse?.actionTitle ?? actionCopy.title;
  // Long letters open folded so the reply stays in reach.
  const long = entry.text.length > 520 || entry.text.split("\n").length > 9;
  function edit() {
    update({
      text: entry!.text,
      createdAt: entry!.createdAt,
      chosen: entry!.feelings ?? {},
      audio: entry!.audio,
      entryId: entry!.id,
    });
    router.push("/(tabs)/diary");
  }
  function openAction(selectedAction = action) {
    setNoteAction(selectedAction);
    const routes: Record<string, Href> = {
      A01: "/candle",
      A21: "/candle",
      A27: "/gathering/create",
      A15: "/prayers?compose=1",
      A16: "/prayers",
      A18: "/giving",
      A20: "/testimonies/edit",
      A26: "/study",
    };
    if (selectedAction === "A04" || selectedAction === "A14") {
      router.push(confessionJournalTarget(entry!.id, selectedAction));
      return;
    }
    if (selectedAction === "A25" && selectedAction === action && hasJournalGatheringTopic(journalTheme(entry!).id)) {
      // Match on the already-selected theme locally; never send journal text to the catalog.
      void gathering("list").then((items) => {
        const match = Array.isArray(items) ? matchingJournalGathering(items, journalTheme(entry!).id, profile.language) : undefined;
        if (match) router.push({ pathname: "/gathering/[id]", params: { id: match.id } });
        else router.push({ pathname: "/(tabs)/gatherings", params: { journalMatch: "none", returnEntry: entry!.id } });
      }).catch(() => router.push({ pathname: "/(tabs)/gatherings", params: { returnEntry: entry!.id } }));
      return;
    }
    if (selectedAction === "A19" || selectedAction === "A25") {
      router.push({ pathname: selectedAction === "A19" ? "/(tabs)/explore" : "/(tabs)/gatherings", params: { returnEntry: entry!.id } });
      return;
    }
    if (routes[selectedAction]) {
      router.push(routes[selectedAction]);
      return;
    }
    setNote(entry!.reflection ?? "");
    setNotice("");
    setNoteOpen(true);
  }
  async function saveNote() {
    setBusy(true);
    setNotice("");
    try {
      await saveEntry({ ...entry!, reflection: note }, true);
      setNoteOpen(false);
      setNotice(jc(lang, "saved"));
    } catch {
      setNotice(copy(lang, "storageError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <JournalConversation
        key={entry.id}
        entry={entry}
        initialAction={action}
        onAction={openAction}
      >
        <JournalGuidanceStatus entry={entry} />
        <View style={s.letter}>
          <View style={s.margin} />
          <View style={s.letterTop}>
            <Text style={s.date}>
              {new Date(entry.createdAt).toLocaleDateString(lang, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={jc(lang, "editLetterLabel")}
              onPress={edit}
              hitSlop={8}
              style={({ pressed }) => [s.edit, pressed && { opacity: 0.6 }]}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={colors.goldInk}
              />
              <Text style={s.editText}>{jc(lang, "editLetter")}</Text>
            </Pressable>
          </View>
          <Text style={s.dear}>{q(lang, "dear")}</Text>
          <Text
            selectable
            numberOfLines={long && !expanded ? 9 : undefined}
            style={s.writing}
          >
            {entry.text || copy(lang, "audioEntry")}
          </Text>
          {long && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpanded(!expanded)}
              style={s.more}
            >
              <Text style={s.moreText}>
                {jc(lang, expanded ? "showLess" : "readAll")}
              </Text>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={15}
                color={colors.goldInk}
              />
            </Pressable>
          )}
          {!!entry.revisions?.length && (
            <View style={s.earlier}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: earlierOpen }}
                onPress={() => setEarlierOpen(!earlierOpen)}
                style={s.more}
              >
                <Text style={s.moreText}>
                  {entry.editedAt
                    ? q(lang, "editedOn").replace(
                        "{date}",
                        new Date(entry.editedAt).toLocaleDateString(lang, {
                          month: "long",
                          day: "numeric",
                        }),
                      ) + " · "
                    : ""}
                  {q(
                    lang,
                    earlierOpen ? "hideEarlierVersion" : "earlierVersion",
                  )}
                </Text>
                <Ionicons
                  name={earlierOpen ? "chevron-up" : "chevron-down"}
                  size={15}
                  color={colors.goldInk}
                />
              </Pressable>
              {earlierOpen &&
                entry.revisions.map((revision) => (
                  <Text key={revision.savedAt} selectable style={s.earlierText}>
                    {revision.text}
                  </Text>
                ))}
            </View>
          )}
          {entry.audio && <AudioPlayback id={entry.audio} language={lang} />}
        </View>
        {entry.safety ? (
          <Card>
            <Heading>{copy(lang, "supportTitle")}</Heading>
            <Body>{copy(lang, "supportDesc")}</Body>
            <Button
              title={jc(lang, "A07")}
              onPress={() => {
                setNote("");
                setNoteOpen(true);
              }}
            />
          </Card>
        ) : (
          <View style={s.reply}>
            <View style={s.section}>
              <Text style={s.label}>{jc(lang, "wordForYou")}</Text>
              {loading ? (
                <Body>{copy(lang, "cLoading")}</Body>
              ) : verse ? (
                <>
                  <Text selectable style={s.verse}>
                    {verse.text}
                  </Text>
                  <Text style={s.reference}>
                    {verse.reference}
                    <Text style={s.edition}> · {verse.editionName}</Text>
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={q(lang, "understand")}
                    style={s.verseLink}
                    onPress={() =>
                      router.push({
                        pathname: "/verse/[id]",
                        // The theme verse reference finds the explanation
                        // whatever number this edition prints for the verse.
                        params: {
                          id: verseRouteId(verse.id),
                          journal: journalTheme(entry).verse,
                        },
                      })
                    }
                  >
                    <Text style={s.verseLinkText}>{q(lang, "understand")}</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={15}
                      color={colors.ink}
                    />
                  </Pressable>
                </>
              ) : (
                <Body>{copy(lang, "unavailable")}</Body>
              )}
            </View>
            {!loading && <>
            <View style={s.divider} />
            <View style={s.section}>
              <Text style={s.label}>{jc(lang, "smallStep")}</Text>
              <Text style={s.invitation}>
                {displayedJournalInvitation(lang, journalTheme(entry).id, action, displayResponse?.invitation)}
              </Text>
              <JournalActionButton
                primary
                title={actionTitle}
                onPress={() => openAction()}
              />
            </View>
            </>}
          </View>
        )}
        <Notice text={notice} />
      </JournalConversation>
      <Modal
        visible={noteOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteOpen(false)}
      >
        <View style={s.backdrop}>
          <View style={s.sheet}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              contentContainerStyle={{ gap: 16, padding: 24 }}
            >
              <TextAction
                title={jc(lang, "close")}
                icon="close"
                onPress={() => setNoteOpen(false)}
              />
              <Heading>
                {entry.safety
                  ? jc(lang, "A07")
                  : noteAction && noteAction !== action
                    ? jc(lang, noteAction as JournalCopyKey)
                    : actionTitle}
              </Heading>
              <Body>
                {!noteAction || noteAction === action
                  ? (displayResponse?.actionPrompt ?? actionCopy.prompt)
                  : journalActionCopy(lang, "", noteAction).prompt}
              </Body>
              <Field
                label={jc(lang, "private")}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={3000}
              />
              <Notice text={notice} />
              <Button
                disabled={busy}
                title={jc(lang, "save")}
                onPress={() => void saveNote()}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  // The same paper as the writing page, so the entry still reads as a letter.
  letter: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    paddingLeft: 38,
    borderWidth: 1,
    borderColor: "#B28A3E20",
    boxShadow: "0px 12px 35px rgba(48,44,40,.055)",
    gap: 4,
  },
  margin: {
    position: "absolute",
    left: 24,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#B28A3E40",
  },
  letterTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  date: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 18 },
  edit: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#B28A3E40",
  },
  editText: { fontSize: 13, fontWeight: "600", color: colors.goldInk },
  dear: {
    fontFamily: serif,
    fontSize: 22,
    lineHeight: 30,
    fontStyle: "italic",
    color: colors.ink,
    marginBottom: 8,
  },
  writing: {
    fontFamily: serif,
    fontSize: 18,
    lineHeight: 29,
    color: colors.ink,
  },
  more: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  moreText: { fontSize: 13, fontWeight: "600", color: colors.goldInk },
  earlier: {
    gap: 10,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  earlierText: {
    fontFamily: serif,
    fontSize: 16,
    lineHeight: 26,
    color: colors.muted,
    fontStyle: "italic",
  },
  // The reply: one column with one left edge, a verse then one small step.
  reply: { paddingTop: 10, paddingHorizontal: 4, gap: 20 },
  section: { gap: 12 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: colors.goldInk,
  },
  verse: { fontFamily: serif, fontSize: 22, lineHeight: 32, color: colors.ink },
  reference: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
    color: colors.ink,
  },
  edition: { fontWeight: "400", color: colors.muted },
  verseLink: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  verseLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
    textDecorationLine: "underline",
    textDecorationColor: "#B28A3E80",
  },
  divider: { height: 1, backgroundColor: colors.line },
  invitation: { fontSize: 16, lineHeight: 25, color: colors.ink },
  backdrop: {
    flex: 1,
    backgroundColor: "#302C2855",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "85%",
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
});
