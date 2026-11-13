import { communityCopy } from "../../lib/community-copy";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import {
  Screen,
  Heading,
  Body,
  Field,
  Notice,
  Busy,
  Button,
  colors,
} from "../../components/community-ui";
import { TextAction } from "../../components/CommunityControls";
import DiscoverPost from "../../components/DiscoverPost";
import PublicDiscussions from "../../components/PublicDiscussions";
import { useApp } from "../../lib/state";
import { useDiscover, useInteractions } from "../../lib/discover";
import { useInterfaceCopy } from "../../lib/use-interface-copy";
import { journalReturnId } from "../../lib/journal-navigation";
export default function Explore() {
  const tr = useInterfaceCopy();
  const { profile, entries } = useApp(),
    c = (k: string) => communityCopy(profile.language, k),
    { category: requested, returnEntry } = useLocalSearchParams<{
      category?: string;
      returnEntry?: string;
    }>(),
    category = requested === "discussions" ? "discussions" : "all";
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const feed = useDiscover("all", query, profile.language),
    reactions = useInteractions(feed.items.map((x) => x.id));
  const visibleStories = feed.items.filter(
    (item) => !item.tradition || item.tradition === profile.tradition,
  );
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
    <View
      style={{
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      {[
        { value: "all", label: tr("Testimonies & stories") },
        { value: "discussions", label: tr("Discussions") },
      ].map((option) => {
        const selected = category === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => router.setParams({ category: option.value })}
            style={{
              flex: 1,
              minHeight: 48,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 5,
              borderBottomWidth: selected ? 2 : 0,
              borderBottomColor: colors.gold,
            }}
          >
            <Text
              style={{
                color: selected ? colors.ink : colors.muted,
                fontSize: 14,
                lineHeight: 20,
                fontWeight: selected ? "600" : "400",
                textAlign: "center",
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  return (
    <Screen place="window" back={!!journalReturnId(returnEntry, entries)}>
      {discoverHeader}
      {category === "discussions" ? (
        <PublicDiscussions query={query} />
      ) : (
        <>
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
            <Button
              secondary
              title={c("retry")}
              onPress={() => void feed.load()}
            />
          )}
          {visibleStories.map((item) => (
            <DiscoverPost key={item.id} item={item} interactions={reactions} />
          ))}
          {feed.loading && <Busy />}
          {!feed.loading &&
            !feed.error &&
            !visibleStories.length &&
            !feed.more && (
              <Body>
                {profile.language === "pt" && !query
                  ? "Ainda não há histórias em português. Volte em breve."
                  : c("noStories")}
              </Body>
            )}
          {feed.more && !feed.loading && (
            <Button
              secondary
              title={c("moreStories")}
              onPress={() => void feed.load(true)}
            />
          )}
        </>
      )}
    </Screen>
  );
}
