import { useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Button,
  Field,
  External,
  Notice,
} from "../../components/ui";
import AudioPlayback from "../../components/AudioPlayback";
import { useApp } from "../../lib/state";
import {
  copy,
  data,
  passagesFor,
  localized,
  needsSupport,
} from "../../lib/content";
export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, profile, saveEntry } = useApp();
  const entry = entries.find((e) => e.id === id);
  const [stage, setStage] = useState(0),
    [reflection, setReflection] = useState(entry?.reflection ?? ""),
    [error, setError] = useState("");
  const t = (k: string) => copy(profile.language, k);
  if (!entry)
    return (
      <Screen back>
        <Body>{t("emptySub")}</Body>
      </Screen>
    );
  const path = data.PATHS[entry.mood],
    verses = passagesFor(entry.prefs, entry.mood);
  async function choose(action: string) {
    if (!entry) return;
    try {
      await saveEntry({ ...entry, action });
      setStage(2);
    } catch {
      setError(t("storageError"));
    }
  }
  return (
    <Screen back>
      <Body small>
        {new Date(entry.createdAt).toLocaleDateString(profile.language)} ·{" "}
        {t(entry.guidance === "general" ? "generalContext" : entry.mood)}
      </Body>
      <Heading>
        {t(
          entry.safety
            ? "supportTitle"
            : stage === 0
              ? "verseTitle"
              : stage === 1
                ? "actionTitle"
                : "afterStep",
        )}
      </Heading>
      <Notice text={error} />
      {entry.safety ? (
        <>
          <Body>{t("supportDesc")}</Body>
          <Body>{t("supportBoundary")}</Body>
          <Body>{entry.text}</Body>
        </>
      ) : (
        <>
          {stage === 0 && (
            <>
              {entry.guidance === "general" && (
                <Body small>{t("previewExplanation")}</Body>
              )}
              <Body>
                {t(
                  entry.guidance === "general"
                    ? "generalReflection"
                    : path.reflection,
                )}
              </Body>
              {verses.length ? (
                verses.map((v) => (
                  <Card tint key={v.id}>
                    <Subheading>“{v.text}”</Subheading>
                    <Body small>
                      {v.reference} · {v.editionName}
                    </Body>
                    <Body>{localized(v.context, profile.language)}</Body>
                    <External title={t("source")} url={v.sourceUrl} />
                    <Body small>{v.attribution}</Body>
                  </Card>
                ))
              ) : (
                <Notice text={t("unavailable")} />
              )}
              <Button title={t("toActions")} onPress={() => setStage(1)} />
              <Card>
                <Body small>{t("original")}</Body>
                <Body>{entry.text || t("audioEntry")}</Body>
                {entry.audio && (
                  <AudioPlayback id={entry.audio} language={profile.language} />
                )}
              </Card>
            </>
          )}
          {stage === 1 && (
            <>
              <Body>
                {t(
                  entry.guidance === "general"
                    ? "generalActionIntro"
                    : "actionIntro",
                )}
              </Body>
              {path.actions.map((action) => {
                const evidence =
                  data.EVIDENCE[
                    data.ACTION_EVIDENCE[
                      action as keyof typeof data.ACTION_EVIDENCE
                    ] as keyof typeof data.EVIDENCE
                  ];
                return (
                  <Card key={action}>
                    <Subheading>{t(action)}</Subheading>
                    <Body>{t(action + "Body")}</Body>
                    <Body small>{t("whyHelp")}</Body>
                    <Body>{t(evidence.key)}</Body>
                    {"url" in evidence && (
                      <External title={evidence.source} url={evidence.url} />
                    )}
                    <Body small>{t("evidenceNote")}</Body>
                    {action === "visitElders" || action === "smallGood" ? (
                      <Button
                        secondary
                        title={t("pNearYou")}
                        onPress={() => router.push("/organizations")}
                      />
                    ) : null}
                    {action === "community" || action === "tellSomeone" ? (
                      <Button
                        secondary
                        title={t("weeklySessionTitle")}
                        onPress={() => router.push("/(tabs)/gatherings")}
                      />
                    ) : null}
                    {action === "gentleWalk" || action === "goodNews" ? (
                      <Button
                        secondary
                        title={t(action === "goodNews" ? "news" : "music")}
                        onPress={() =>
                          router.push({
                            pathname: "/(tabs)/explore",
                            params: {
                              category:
                                action === "goodNews" ? "news" : "music",
                            },
                          })
                        }
                      />
                    ) : null}
                    <Button
                      title={t("chooseStep")}
                      onPress={() => void choose(action)}
                    />
                  </Card>
                );
              })}
              <Subheading>{t("pBooks")}</Subheading>
              <Body small>{t("pBookNote")}</Body>
              {data.BOOKS.filter((b) => b.moods.includes(entry.mood))
                .slice(0, 2)
                .map((b) => (
                  <Card key={b.id}>
                    <Subheading>{b.title}</Subheading>
                    <Body small>
                      {b.author} · {b.language}
                    </Body>
                    <Body>{localized(b.note, profile.language)}</Body>
                    <External title={t("pBookSource")} url={b.url} />
                  </Card>
                ))}
            </>
          )}
          {stage === 2 && (
            <>
              <Card tint>
                <Subheading>{t(entry.action ?? "quietPrayer")}</Subheading>
                <Body>{t((entry.action ?? "quietPrayer") + "Body")}</Body>
              </Card>
              {needsSupport(reflection) && (
                <Card>
                  <Subheading>{t("supportTitle")}</Subheading>
                  <Body>{t("supportDesc")}</Body>
                  <Body small>{t("supportBoundary")}</Body>
                </Card>
              )}
              <Field
                label={t("followup")}
                value={reflection}
                onChangeText={setReflection}
                multiline
                maxLength={10000}
              />
              <Button
                title={t(needsSupport(reflection) ? "supportSave" : "finish")}
                onPress={() => {
                  void saveEntry({
                    ...entry,
                    reflection,
                    safety: entry.safety || needsSupport(reflection),
                  })
                    .then(() => router.replace("/(tabs)"))
                    .catch(() => setError(t("storageError")));
                }}
              />
              <Button
                secondary
                title={t("changeStep")}
                onPress={() => setStage(1)}
              />
            </>
          )}
        </>
      )}
    </Screen>
  );
}
