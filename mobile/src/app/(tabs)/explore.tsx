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
import { useDiscover, useInteractions } from "../../lib/discover";
import Community from "../community";
import { useInterfaceCopy } from "../../lib/use-interface-copy";
export default function Explore() {
  const tr = useInterfaceCopy();
  const { profile } = useApp(),
    c = (k: string) => communityCopy(profile.language, k),
    { category: requested } = useLocalSearchParams<{ category?: string }>(),
    category = requested === "discussions" ? "discussions" : "all";
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
  const discoverHeader = (
    <>
      <Heading>{c("discover")}</Heading>
      <Field
        label={c("searchDiscover")}
        hideLabel
        placeholder={c("searchDiscover")}
        value={search}
        onChangeText={setSearch}
      />
      {sections}
    </>
  );
  if (category === "discussions")
    return <Community header={discoverHeader} search={query} />;
  return (
    <Screen
      place="window"
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
      {discoverHeader}
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
        <Body>{c("noStories")}</Body>
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
