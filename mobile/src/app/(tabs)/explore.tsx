import { friendCopy } from "../../lib/friends-copy";
import { communityCopy } from "../../lib/community-copy";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Redirect,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
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
  // Discover keeps itself fresh: it reloads when you come back to it and every
  // two minutes, unless you have scrolled further down the list.
  const latest = useRef(feed);
  useEffect(() => {
    latest.current = feed;
  });
  const visited = useRef(false);
  useFocusEffect(
    useCallback(() => {
      const fresh = () => {
        const now = latest.current;
        if (!now.loading) void now.load(false, true);
      };
      if (visited.current) fresh();
      visited.current = true;
      const timer = setInterval(fresh, 120000);
      return () => clearInterval(timer);
    }, []),
  );
  const sections = (
    <FilterStrip
      options={[
        { value: "all", label: tr("Testimonies & stories") },
        { value: "discussions", label: tr("Discussions") },
      ]}
      value={category === "discussions" ? "discussions" : "all"}
      onChange={(value) => {
        // Discussions live in one place: Your people, on Gather.
        if (value === "discussions") router.push("/friends");
      }}
    />
  );
  const discoverHeader = (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Heading>{c("discover")}</Heading>
        <TextAction
          title={friendCopy(profile.language, "Find friends")}
          icon="people-outline"
          onPress={() => router.push("/friends")}
        />
      </View>
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
  if (category === "discussions") return <Redirect href="/friends" />;
  return (
    <Screen place="window">
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
