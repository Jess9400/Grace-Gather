import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Button,
  Notice,
  External,
  Busy,
} from "../../components/quiet-ui";
import { useApp } from "../../lib/state";
import { copy, localized } from "../../lib/content";
import { useCatalog } from "../../lib/community";
import * as storage from "../../lib/storage";
export default function Course() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { profile } = useApp(),
    { items, loading } = useCatalog("course");
  const [completed, setCompleted] = useState<string[]>([]),
    [error, setError] = useState("");
  const item = items.find((c) => c.id === id),
    t = (k: string) => copy(profile.language, k);
  useEffect(() => {
    void storage
      .getItem("course:" + id)
      .then((v) => setCompleted(v ? JSON.parse(v) : []))
      .catch(() => setError(copy(profile.language, "storageError")));
  }, [id, profile.language]);
  if (loading)
    return (
      <Screen back>
        <Busy />
      </Screen>
    );
  if (!item)
    return (
      <Screen back>
        <Body>{t("noResults")}</Body>
      </Screen>
    );
  return (
    <Screen back>
      <Body small>
        {item.provider} · {item.lang} · {t("free")}
      </Body>
      <Heading>{localized(item.title, profile.language)}</Heading>
      <Body>{localized(item.summary, profile.language)}</Body>
      {item.lessons?.map((key, i) => (
        <Card key={key}>
          <Subheading>
            {i + 1} / {item.lessons?.length}
          </Subheading>
          <Body>{t(key)}</Body>
          <Button
            secondary
            title={t(completed.includes(key) ? "lessonComplete" : "lessonDone")}
            onPress={() => {
              const next = completed.includes(key)
                ? completed.filter((k) => k !== key)
                : [...completed, key];
              void storage
                .setItem("course:" + id, JSON.stringify(next))
                .then(() => setCompleted(next))
                .catch(() => setError(copy(profile.language, "storageError")));
            }}
          />
        </Card>
      ))}
      {item.url && <External title={t("startCourse")} url={item.url} />}
      <Body small>{t("courseNote")}</Body>
      <Notice text={error} />
    </Screen>
  );
}
