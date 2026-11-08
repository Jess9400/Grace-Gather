import { setStudyDiscussionTopic } from "../lib/study-discussion-draft";
import { useState } from "react";
import { router } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Field,
  Card,
  Button,
  External,
} from "../components/quiet-ui";
import { useApp } from "../lib/state";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { data, moods, copy, passagesFor } from "../lib/content";
export default function Study() {
  const { profile } = useApp();
  const tr = useInterfaceCopy();
  const [query, setQuery] = useState("");
  const normalize = (s: string) =>
    s
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const needle = normalize(query.trim());
  const topics = moods
    .map((mood) => ({
      mood,
      title: copy(profile.language, data.PATHS[mood].label),
      verses: passagesFor(profile, mood),
    }))
    .filter(
      (topic) =>
        !needle ||
        normalize(
          [
            topic.title,
            ...topic.verses.map((v) => v.reference + " " + v.text),
          ].join(" "),
        ).includes(needle),
    );
  return (
    <Screen back>
      <Heading>{tr("Explore a theme")}</Heading>
      <Body>
        {tr(
          "Search these curated themes, verse references and passages in your chosen Bible edition. This is not an AI answer or a full-Bible search.",
        )}
      </Body>
      <Field
        label={tr("Theme or passage")}
        value={query}
        onChangeText={setQuery}
      />
      {!topics.length && (
        <Body>
          {tr("No matching theme yet. Try another word or start a discussion.")}
        </Body>
      )}
      {topics.map((topic) => (
        <Card key={topic.mood}>
          <Heading>{topic.title}</Heading>
          {!topic.verses.length && (
            <Body>{tr("This passage is unavailable.")}</Body>
          )}
          {topic.verses.map((v) => (
            <Button
              secondary
              key={v.id}
              title={v.reference}
              onPress={() =>
                router.push({ pathname: "/verse/[id]", params: { id: v.id } })
              }
            />
          ))}
          <Button
            secondary
            title={tr("Start a discussion about this topic")}
            onPress={() => {
              setStudyDiscussionTopic(topic.title);
              router.push({ pathname: "/community", params: { compose: "1" } });
            }}
          />
        </Card>
      ))}
      <Button
        secondary
        title={tr("Start a discussion")}
        onPress={() => {
          setStudyDiscussionTopic(query);
          router.push({ pathname: "/community", params: { compose: "1" } });
        }}
      />
      <Heading>{tr("Study resources")}</Heading>
      <Body>
        {tr(
          "External resources have their own language, translation and theological perspective. They do not change your selected Bible edition.",
        )}
      </Body>
      <External
        title={tr("STEP Bible · Hebrew / Greek")}
        url="https://www.stepbible.org/"
      />
      <External
        title={tr("BibleProject · Videos & word studies")}
        url="https://bibleproject.com/videos/"
      />
    </Screen>
  );
}
