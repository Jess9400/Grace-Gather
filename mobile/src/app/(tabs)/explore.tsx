import { communityCopy } from "../../lib/community-copy";
import { useEffect, useState, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import {
  Screen,
  Heading,
  Body,
  Field,
  Notice,
  Busy,
  Button,
} from "../../components/ui";
import { FilterStrip, TextAction } from "../../components/QuietControls";
import DiscoverPost from "../../components/DiscoverPost";
import { useApp } from "../../lib/state";
import { copy } from "../../lib/content";
import { useDiscover, useInteractions } from "../../lib/discover";
import { backend } from "../../lib/backend";
export default function Explore() {
  const { profile } = useApp(),
    c = (k: string) => communityCopy(profile.language, k),
    { category: requested } = useLocalSearchParams<{ category?: string }>(),
    category = requested ?? "all";
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [newsStatus, setNewsStatus] = useState("");
  const feed = useDiscover(category, query),
    reactions = useInteractions(feed.items.map((x) => x.id));
  const reload = useRef(feed.load);
  useEffect(() => {
    reload.current = feed.load;
  }, [feed.load]);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (category !== "news" && category !== "older") return;
    let active = true;
    void backend?.functions.invoke("news").then(({ data, error }) => {
      if (!active) return;
      setNewsStatus(error || data?.stale ? "newsFallback" : "");
      if (!error) void reload.current();
    });
    return () => {
      active = false;
    };
  }, [category]);
  return (
    <Screen
      headerAction={
        <TextAction
          icon="refresh-outline"
          iconOnly
          title={c("retry")}
          disabled={feed.loading}
          onPress={() => void feed.load()}
        />
      }
    >
      <Heading>{c("discover")}</Heading>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <TextAction
          title={c("shareTestimony")}
          icon="create-outline"
          onPress={() => router.push("/testimonies/edit")}
        />
        <TextAction
          title={c("myTestimonies")}
          icon="person-outline"
          onPress={() => router.push("/testimonies")}
        />
      </View>
      <Field
        label="Search Discover"
        hideLabel
        placeholder={c("searchDiscover")}
        value={search}
        onChangeText={setSearch}
      />
      <FilterStrip
        options={[
          "all",
          "testimonies",
          "stories",
          "news",
          "older",
          "music",
          "psalms",
          "prayers",
          "bible",
          "saved",
        ].map((value) => ({
          value,
          label:
            (
              {
                testimonies: c("testimonies"),
                news: c("goodNews"),
                older: c("earlierNews"),
                saved: c("saved"),
              } as Record<string, string>
            )[value] ?? copy(profile.language, value),
        }))}
        value={category}
        onChange={(c) => router.setParams({ category: c })}
      />
      {category === "news" && <Body small>{c("newsTime")}</Body>}
      {category === "older" && <Body small>{c("olderTime")}</Body>}
      <Notice text={feed.error || reactions.error || c(newsStatus)} />
      {!!feed.error && (
        <Button secondary title={c("retry")} onPress={() => void feed.load()} />
      )}
      {feed.items
        .filter((x) => !x.tradition || x.tradition === profile.tradition)
        .map((item) => (
          <DiscoverPost key={item.id} item={item} interactions={reactions} />
        ))}
      {feed.loading && <Busy />}
      {!feed.loading && !feed.error && !feed.items.length && (
        <>
          <Body>
            {c(
              category === "news"
                ? "noNews"
                : category === "testimonies"
                  ? "noTestimonies"
                  : category === "saved"
                    ? "noSaved"
                    : "noStories",
            )}
          </Body>
          {category === "news" && (
            <Button
              secondary
              title={c("browseEarlier")}
              onPress={() => router.setParams({ category: "older" })}
            />
          )}
        </>
      )}
      {feed.more && !feed.loading && (
        <Button
          secondary
          title={c("moreStories")}
          onPress={() => void feed.load(true)}
        />
      )}
    </Screen>
  );
}
