import { useState } from "react";
import { Platform, Text, View, Linking } from "react-native";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import {
  Screen,
  Heading,
  Body,
  Subheading,
  Card,
  Field,
  Button,
  Notice,
  colors,
} from "../../components/ui";
import { Disclosure, TextAction } from "../../components/QuietControls";
import { designCopy } from "../../lib/design-copy";
import Recorder from "../../components/Recorder";
import GuidanceControl from "../../components/GuidanceControl";
import { useApp } from "../../lib/state";
import { copy, dailyVerse, needsSupport, Entry } from "../../lib/content";
import { label } from "../../lib/labels";
import { aiCopy } from "../../lib/ai-copy";
import { suggestJourney } from "../../lib/ai";
import { transcribeRecording } from "../../lib/ai-audio";
export default function Journal() {
  const { profile, saveEntry } = useApp();
  const [verseOpen, setVerseOpen] = useState(false);
  const d = (key: Parameters<typeof designCopy>[1]) =>
    designCopy(profile.language, key);
  const [text, setText] = useState(""),
    [audio, setAudio] = useState<string>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false),
    [useAI, setUseAI] = useState(false),
    [transcribed, setTranscribed] = useState(false);
  const t = (k: string) => copy(profile.language, k),
    verse = dailyVerse(profile),
    support = needsSupport(text);
  async function submit() {
    if (!text.trim() && !audio) {
      setError(t("needEntry"));
      return;
    }
    if (useAI && !text.trim()) {
      setError(aiCopy(profile.language, "writingFirst"));
      return;
    }
    setBusy(true);
    const id = randomUUID();
    try {
      let entry: Entry = {
        id,
        createdAt: new Date().toISOString(),
        mood: "unsure",
        guidance: "general",
        text: text.trim(),
        audio,
        safety: support,
        prefs: profile,
      };
      await saveEntry(entry);
      if (useAI && !support) {
        try {
          const suggestion = await suggestJourney(text.trim(), profile);
          entry = {
            ...entry,
            mood: suggestion.path,
            guidance: "ai",
            safety: suggestion.support,
            passageIds: suggestion.passageIds,
            actionIds: suggestion.actionIds,
          };
        } catch {
          entry = { ...entry, aiUnavailable: true };
        }
        await saveEntry(entry);
      }
      setText("");
      setAudio(undefined);
      setError("");
      setUseAI(false);
      setTranscribed(false);
      router.push({ pathname: "/entry/[id]", params: { id } });
    } catch {
      setError(t("storageError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      keyboardAware
      headerAction={
        <TextAction
          title={t("history")}
          icon="time-outline"
          iconOnly
          onPress={() => router.push("/history")}
        />
      }
    >
      <View style={{ gap: 6 }}>
        <Body small>
          {profile.name
            ? `${t("pHello")}, ${profile.name}`
            : label(profile.language, "launch")}
        </Body>
        <Heading>{t("heart")}</Heading>
      </View>
      <View
        style={{
          borderLeftWidth: 2,
          borderLeftColor: colors.gold,
          paddingLeft: 15,
          gap: 7,
        }}
      >
        <Body small>{t("pDaily")}</Body>
        {verse ? (
          <>
            <Text
              selectable
              numberOfLines={verseOpen ? undefined : 2}
              style={{
                color: colors.ink,
                fontSize: 17,
                lineHeight: 25,
                fontFamily: Platform.OS === "android" ? "serif" : "Georgia",
              }}
            >
              “{verse.text}”
            </Text>
            <TextAction
              title={verse.reference}
              icon={verseOpen ? "chevron-up" : "chevron-down"}
              onPress={() => setVerseOpen(!verseOpen)}
            />
            {verseOpen && (
              <>
                <Body small>{verse.editionName}</Body>
                <TextAction
                  title={t("source")}
                  icon="open-outline"
                  onPress={() => {
                    if (verse.sourceUrl.startsWith("https://"))
                      void Linking.openURL(verse.sourceUrl);
                  }}
                />
              </>
            )}
          </>
        ) : (
          <Body>{t("unavailable")}</Body>
        )}
      </View>
      <View style={{ gap: 5 }}>
        <Field
          label={t("entryLabel")}
          hideLabel
          value={text}
          onChangeText={setText}
          placeholder={t("prompt")}
          multiline
          maxLength={30000}
          style={{ minHeight: 190, lineHeight: 25 }}
        />
        {Platform.OS !== "web" && (
          <Disclosure title={d("voiceNote")} disabled={recording || !!audio}>
            <Recorder
              language={profile.language}
              value={audio}
              onChange={setAudio}
              onBusyChange={setRecording}
            />
          </Disclosure>
        )}
      </View>
      <View style={{ gap: 12 }}>
        <Subheading>{t("continue")}</Subheading>
        <GuidanceControl
          language={profile.language}
          value={useAI}
          onChange={setUseAI}
          disabled={busy || recording}
        >
          {useAI && audio && (
            <Button
              disabled={busy || recording}
              title={aiCopy(profile.language, "transcribe")}
              onPress={() => {
                setBusy(true);
                setError("");
                void transcribeRecording(audio, profile.language)
                  .then((transcript) => {
                    setText((previous) =>
                      [previous.trim(), transcript]
                        .filter(Boolean)
                        .join("\n\n")
                        .slice(0, 30000),
                    );
                    setTranscribed(true);
                  })
                  .catch(() =>
                    setError(aiCopy(profile.language, "requestFailed")),
                  )
                  .finally(() => setBusy(false));
              }}
            />
          )}
          {transcribed && (
            <Body small>{aiCopy(profile.language, "review")}</Body>
          )}
        </GuidanceControl>
        {support && (
          <Card>
            <Subheading>{t("supportTitle")}</Subheading>
            <Body>{t("supportDesc")}</Body>
            <Body small>{t("supportBoundary")}</Body>
          </Card>
        )}
        <Notice text={error} />
        <Button
          disabled={busy || recording}
          title={
            busy
              ? aiCopy(profile.language, "working")
              : support
                ? t("supportSave")
                : d("findScripture")
          }
          onPress={() => void submit()}
        />
        <Body small>
          {Platform.OS === "web"
            ? label(profile.language, "webDemo")
            : aiCopy(profile.language, "local")}
        </Body>
      </View>
    </Screen>
  );
}
