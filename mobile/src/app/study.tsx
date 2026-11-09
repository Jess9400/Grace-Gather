import { getStudySearch } from "../lib/study-search";
import { FilterStrip } from "../components/CommunityControls";
import { setStudyDiscussionTopic } from "../lib/study-discussion-draft";
import { useEffect, useState } from "react";
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
import { collectionFor, ensureCollection, getReadingVerse } from "../lib/bible";
export default function Study({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const { profile } = useApp();
  const tr = useInterfaceCopy();
  const [panel, setPanel] = useState("topics");
  const [query, setQuery] = useState(getStudySearch);
  const normalize = (s: string) =>
    s
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const needle = normalize(query.trim());
  const collection = collectionFor(profile);
  const [loaded, setLoaded] = useState("");
  useEffect(() => {
    let active = true;
    if (collection)
      void ensureCollection(collection)
        .then(() => {
          if (active) setLoaded(collection);
        })
        .catch(() => {
          if (active) setLoaded("");
        });
    return () => {
      active = false;
    };
  }, [collection]);
  const topics = [
    { mood: "grace", title: tr("Grace"), refs: ["EPH.2.8"] },
    { mood: "forgiveness", title: tr("Forgiveness"), refs: ["MAT.6.14"] },
    { mood: "wisdom", title: tr("Wisdom"), refs: ["JAS.1.5"] },
    { mood: "hope", title: tr("Hope"), refs: ["ROM.15.13"] },
    { mood: "peace", title: tr("Peace"), refs: ["JHN.14.27"] },
    { mood: "rest", title: tr("Rest"), refs: ["MAT.11.28"] },
    { mood: "love", title: tr("Love"), refs: ["JHN.15.9"] },
    { mood: "gratitude", title: tr("Gratitude"), refs: ["1TH.5.18"] },
  ]
    .map((topic) => ({
      ...topic,
      verses:
        collection && loaded === collection
          ? topic.refs
              .map((ref) => getReadingVerse(`${collection}:${ref}`))
              .filter((v): v is NonNullable<typeof v> => !!v)
          : [],
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
    <Screen back={!embedded}>
      <Heading>{tr("Bible Study")}</Heading>
      <Button
        secondary
        title={tr("Read by chapter")}
        onPress={() =>
          router.push({ pathname: "/(tabs)/bible", params: { view: "reader" } })
        }
      />
      <Body>
        {tr("Explore themes and resources in your chosen Bible edition.")}
      </Body>
      <FilterStrip
        options={[
          { value: "topics", label: tr("Explore a theme") },
          { value: "resources", label: tr("Study resources") },
        ]}
        value={panel}
        onChange={setPanel}
      />
      {panel === "topics" && (
        <>
          <Field
            label={tr("Theme or passage")}
            value={query}
            onChangeText={setQuery}
          />
          {!topics.length && (
            <Body>
              {tr(
                "No matching theme yet. Try another word or start a discussion.",
              )}
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
                    router.push({
                      pathname: "/verse/[id]",
                      params: { id: v.id },
                    })
                  }
                />
              ))}
              <Button
                secondary
                title={tr("Start a discussion about this topic")}
                onPress={() => {
                  setStudyDiscussionTopic(topic.title);
                  router.push({
                    pathname: "/community",
                    params: { compose: "1" },
                  });
                }}
              />
            </Card>
          ))}
          <Button
            secondary
            title={tr("Start a discussion")}
            onPress={() => {
              setStudyDiscussionTopic(query);
              router.push({
                pathname: "/community",
                params: { compose: "1" },
              });
            }}
          />
        </>
      )}
      {panel === "resources" && (
        <>
          <Heading>{tr("History & biblical languages")}</Heading>
          <Body>
            {tr(
              "External resources have their own language, translation and theological perspective. They do not change your selected Bible edition.",
            )}
          </Body>
          <External
            title={tr("BibleProject · Book backgrounds")}
            url="https://bibleproject.com/explore/book-overviews/"
          />
          <External
            title={tr("STEP Bible · Hebrew / Greek")}
            url="https://www.stepbible.org/"
          />
          <External
            title={tr("BibleProject · Videos & word studies")}
            url="https://bibleproject.com/videos/"
          />
        </>
      )}
    </Screen>
  );
}
