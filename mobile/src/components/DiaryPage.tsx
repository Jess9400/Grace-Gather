import { useState } from "react";
import { View, Text, TextInput, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Screen, Button, Notice, colors, serif } from "./quiet-ui";
import Recorder from "./QuietRecorder";
import { useApp } from "../lib/state";
import { useQuiet } from "../lib/quiet-state";
import { copy, needsSupport, Entry } from "../lib/content";
import { q } from "../lib/quiet-copy";
import { quietMood } from "../generated/quiet-diary";
import { suggestJourney } from "../lib/ai";
import { transcribeRecording } from "../lib/ai-audio";
import { aiCopy, AI_CONSENT_VERSION } from "../lib/ai-copy";
export default function Diary() {
  const { profile, saveEntry } = useApp(),
    { draft, update } = useQuiet();
  const [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false),
    [error, setError] = useState("");
  const useAI = profile.journalAIConsentVersion === AI_CONSENT_VERSION;
  const lang = profile.language;
  async function submit() {
    if (
      !draft.text.trim() &&
      !draft.audio &&
      !Object.keys(draft.chosen).length
    ) {
      setError(copy(lang, "needEntry"));
      return;
    }
    if (useAI && !draft.text.trim()) {
      setError(aiCopy(lang, "writingFirst"));
      return;
    }
    setBusy(true);
    setError("");
    const mood = quietMood(draft.text, draft.chosen, lang),
      safety = needsSupport(draft.text);
    let entry: Entry = {
      id: draft.entryId ?? randomUUID(),
      createdAt: draft.createdAt,
      text: draft.text,
      audio: draft.audio,
      mood,
      guidance: Object.keys(draft.chosen).length ? "selected" : "local",
      feelings: { ...draft.chosen },
      safety,
      prefs: {
        language: profile.language,
        scriptureLanguage: profile.scriptureLanguage,
        tradition: profile.tradition,
        edition: profile.edition,
      },
    };
    try {
      await saveEntry(entry, true);
      update({ entryId: entry.id });
      if (useAI && !safety) {
        try {
          const result = await suggestJourney(draft.text, profile);
          entry = {
            ...entry,
            mood: result.path,
            guidance: "ai",
            safety: result.support,
            passageIds: result.passageIds,
            actionIds: result.actionIds,
            themeId: result.themeId,
            suggestedAction: result.suggestedAction,
          };
        } catch {
          entry = { ...entry, aiUnavailable: true };
        }
        await saveEntry(entry, true);
      }
      router.push({ pathname: "/entry/[id]", params: { id: entry.id } });
    } catch {
      setError(copy(lang, "storageError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen back place="pews">
      <Text accessibilityRole="header" style={s.title}>
        {q(lang, "land")}
      </Text>
      {Platform.OS !== "web" && (
        <View style={{ gap: 10 }}>
          <Text
            accessibilityRole="header"
            style={{ color: colors.ink, fontSize: 16 }}
          >
            {q(lang, "audioJournal")}
          </Text>
          <Recorder
            language={lang}
            value={draft.audio}
            onChange={(audio) => update({ audio })}
            onBusyChange={setRecording}
          />
          {useAI && draft.audio && (
            <Button
              secondary
              title={aiCopy(lang, "transcribe")}
              disabled={busy || recording}
              onPress={() => {
                setBusy(true);
                void transcribeRecording(draft.audio!, lang)
                  .then((text) =>
                    update({
                      text: [draft.text, text]
                        .filter(Boolean)
                        .join("\n\n")
                        .slice(0, 30000),
                    }),
                  )
                  .catch(() => setError(aiCopy(lang, "requestFailed")))
                  .finally(() => setBusy(false));
              }}
            />
          )}
        </View>
      )}
      <View style={s.paper}>
        <View style={s.rule} />
        <Text style={s.date}>
          {new Date(draft.createdAt).toLocaleDateString(lang, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
        <Text style={s.dear}>{q(lang, "dear")}</Text>
        <TextInput
          accessibilityLabel={copy(lang, "entryLabel")}
          multiline
          maxLength={30000}
          value={draft.text}
          onChangeText={(text) => update({ text })}
          placeholder={copy(lang, "prompt")}
          placeholderTextColor={colors.muted}
          style={s.input}
        />
        <Text style={s.count}>
          {draft.text.trim() ? draft.text.trim().split(/\s+/).length : 0}{" "}
          {q(lang, "words")}
        </Text>
      </View>
      <Notice text={error} />
      <Button
        title={busy ? aiCopy(lang, "working") : q(lang, "done")}
        onPress={() => void submit()}
        disabled={busy || recording}
      />
    </Screen>
  );
}
const s = StyleSheet.create({
  title: { fontFamily: serif, fontSize: 35, lineHeight: 43, color: colors.ink },
  paper: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 25,
    paddingLeft: 37,
    position: "relative",
    borderWidth: 1,
    borderColor: "#B28A3E20",
    marginTop: 8,
    boxShadow: "0px 12px 35px rgba(48,44,40,.055)",
  },
  rule: {
    position: "absolute",
    left: 24,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#B28A3E40",
  },
  date: { color: colors.muted, fontSize: 12, marginBottom: 20 },
  dear: {
    fontFamily: serif,
    fontSize: 26,
    fontStyle: "italic",
    color: colors.ink,
    marginBottom: 16,
  },
  input: {
    color: colors.ink,
    fontFamily: serif,
    fontSize: 21,
    lineHeight: 35,
    minHeight: 280,
    textAlignVertical: "top",
    padding: 0,
  },
  count: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "right",
    marginTop: 15,
  },
});
