import { communityCopy } from "../../lib/community-copy";
import { useEffect, useState } from "react";
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
} from "../../components/community-ui";
import { FilterStrip, TextAction } from "../../components/CommunityControls";
import DiscoverPost from "../../components/DiscoverPost";
import { useApp } from "../../lib/state";
import { copy } from "../../lib/content";
import { useDiscover, useInteractions } from "../../lib/discover";
import Community from "../community";
import { useInterfaceCopy } from "../../lib/use-interface-copy";
export default function Explore() {
  const tr = useInterfaceCopy();
  const { profile } = useApp(),
    c = (k: string) => communityCopy(profile.language, k),
    { category: requested } = useLocalSearchParams<{ category?: string }>(),
    category =
      !requested || ["news", "older"].includes(requested) ? "all" : requested;
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const feed = useDiscover(category, query),
    reactions = useInteractions(feed.items.map((x) => x.id));
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const sections = (
    <FilterStrip
      options={[
        { value: "all", label: tr("Testimonies & stories") },
        { value: "discussions", label: tr("Discussions") },
      ]}
      value={category === "discussions" ? "discussions" : "all"}
      onChange={(value) => router.setParams({ category: value, compose: "" })}
    />
  );
  if (category === "discussions") return <Community header={sections} />;
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
      {sections}
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
                saved: c("saved"),
              } as Record<string, string>
            )[value] ?? copy(profile.language, value),
        }))}
        value={category}
        onChange={(c) => router.setParams({ category: c })}
      />
      <Notice text={feed.error || reactions.error} />
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
              category === "testimonies"
                ? "noTestimonies"
                : category === "saved"
                  ? "noSaved"
                  : "noStories",
            )}
          </Body>
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
