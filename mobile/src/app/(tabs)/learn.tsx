import { useState } from "react";
import { router } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Row,
  Chip,
  Button,
  Busy,
  Notice,
} from "../../components/quiet-ui";
import { useApp } from "../../lib/state";
import { copy, localized } from "../../lib/content";
import { useCatalog } from "../../lib/community";
export default function Learn() {
  const { profile } = useApp(),
    { items, loading, failed } = useCatalog("course");
  const [category, setCategory] = useState("allCourses");
  const t = (k: string) => copy(profile.language, k);
  return (
    <Screen>
      <Heading>{t("learnHeading")}</Heading>
      <Body>{t("learnIntro")}</Body>
      <Row>
        {[
          "allCourses",
          "theology",
          "mindfulness",
          "breathwork",
          "journaling",
          "music",
          "art",
        ].map((c) => (
          <Chip
            key={c}
            title={t(c)}
            selected={c === category}
            onPress={() => setCategory(c)}
          />
        ))}
      </Row>
      {loading && <Busy />}
      <Notice text={failed ? t("socialError") : ""} />
      {items
        .filter((c) => category === "allCourses" || c.category === category)
        .map((c) => (
          <Card key={c.id}>
            <Body small>
              {t("free")} · {t(c.category ?? "course")}
            </Body>
            <Subheading>{localized(c.title, profile.language)}</Subheading>
            <Body>{localized(c.summary, profile.language)}</Body>
            <Body small>
              {c.provider} · {c.lang}
            </Body>
            <Button
              secondary
              title={t("viewCourse")}
              onPress={() =>
                router.push({ pathname: "/course/[id]", params: { id: c.id } })
              }
            />
          </Card>
        ))}
    </Screen>
  );
}
