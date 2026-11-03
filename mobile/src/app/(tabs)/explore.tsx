import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Share, Pressable, View, Text, Linking } from "react-native";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  colors,
  Field,
  Notice,
  Busy,
} from "../../components/ui";
import { FilterStrip, TextAction } from "../../components/QuietControls";
import { designCopy } from "../../lib/design-copy";
import { useApp } from "../../lib/state";
import { copy, localized } from "../../lib/content";
import { useCatalog, useReactions } from "../../lib/community";
import { backend } from "../../lib/backend";
interface News {
  title: string;
  url: string;
  published: string;
  summary: string;
}
export default function Explore() {
  const { profile } = useApp(),
    { category: requested } = useLocalSearchParams<{ category?: string }>();
  const category = requested ?? "all";
  const [search, setSearch] = useState(""),
    [news, setNews] = useState<News[]>([]),
    [newsFailed, setNewsFailed] = useState(false),
    [newsLoaded, setNewsLoaded] = useState(false);
  const newsLoading = !!backend && !newsLoaded;
  const newsError =
    !backend || newsFailed ? copy(profile.language, "newsError") : "";
  const { items, loading, failed } = useCatalog("feed");
  const reactions = useReactions();
  const t = (k: string) => copy(profile.language, k);
  useEffect(() => {
    if (category !== "news" || !backend) return;
    let active = true;
    void backend.functions.invoke("news").then(({ data, error }) => {
      if (!active) return;
      setNewsFailed(!!error);
      setNews(data?.items ?? []);
      setNewsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [category]);
  const visibleItems = items.filter(
    (x) =>
      (!x.tradition || x.tradition === profile.tradition) &&
      (category === "all" || x.type === category) &&
      [
        localized(x.title, profile.language),
        localized(x.summary, profile.language),
        ...(x.tags ?? []).map(t),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <Screen>
      <Heading>{t("explore")}</Heading>
      <Field
        label={t("searchExplore")}
        hideLabel
        placeholder={t("searchExplore")}
        value={search}
        onChangeText={setSearch}
      />
      <FilterStrip
        options={[
          "all",
          "stories",
          "music",
          "psalms",
          "prayers",
          "bible",
          "news",
        ].map((c) => ({ value: c, label: t(c) }))}
        value={category}
        onChange={(c) => router.setParams({ category: c })}
      />
      {loading && <Busy />}
      <Notice text={failed || reactions.failed ? t("socialError") : ""} />
      {category === "news" ? (
        <>
          <Body small>{t("newsNote")}</Body>
          {newsLoading && <Busy />}
          <Notice text={newsError} />
          {!newsLoading && !newsError && !news.length && (
            <Body>{t("newsEmpty")}</Body>
          )}
          {news.map((n) => (
            <Card key={n.url}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={n.title}
                onPress={() => {
                  if (n.url.startsWith("https://")) void Linking.openURL(n.url);
                }}
                style={{ gap: 10 }}
              >
                <Body small>
                  {new Date(n.published).toLocaleString(profile.language)}
                </Body>
                <Subheading>{n.title}</Subheading>
                <Body>{n.summary}</Body>
              </Pressable>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  borderTopWidth: 1,
                  borderTopColor: "#0D30281A",
                }}
              >
                <TextAction
                  title={t("readStory")}
                  icon="open-outline"
                  onPress={() => {
                    if (n.url.startsWith("https://"))
                      void Linking.openURL(n.url);
                  }}
                />
                <TextAction
                  title={t("share")}
                  iconOnly
                  icon="share-outline"
                  onPress={() => {
                    void Share.share({ message: n.title + " " + n.url });
                  }}
                />
              </View>
            </Card>
          ))}
        </>
      ) : (
        visibleItems.map((item) => (
          <Card key={item.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t("readStory")}: ${localized(item.title, profile.language)}`}
              onPress={() =>
                router.push({
                  pathname: "/story/[id]",
                  params: { id: item.id },
                })
              }
              style={{ gap: 10 }}
            >
              <Body small>
                {t(item.type ?? "stories")} · {item.source}
              </Body>
              <Subheading>{localized(item.title, profile.language)}</Subheading>
              <Body>{localized(item.summary, profile.language)}</Body>
            </Pressable>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {item.tags?.map((tag) => (
                <Pressable
                  key={tag}
                  accessibilityRole="button"
                  onPress={() => setSearch(t(tag))}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text style={{ color: colors.cardMuted, fontSize: 12 }}>
                    {t(tag)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderTopColor: "#0D30281A",
                paddingTop: 2,
              }}
            >
              <TextAction
                icon={
                  reactions.liked.includes(item.id) ? "heart" : "heart-outline"
                }
                title={
                  t(reactions.liked.includes(item.id) ? "liked" : "like") +
                  (reactions.counts[item.id]
                    ? ` ${reactions.counts[item.id]}`
                    : "")
                }
                selected={reactions.liked.includes(item.id)}
                disabled={reactions.pending.includes(item.id)}
                onPress={() => {
                  void reactions.toggle(item.id).then((authorized) => {
                    if (!authorized) router.push("/account");
                  });
                }}
              />
              <TextAction
                title={t("comment")}
                iconOnly
                icon="chatbubble-outline"
                onPress={() =>
                  router.push({
                    pathname: "/story/[id]",
                    params: { id: item.id },
                  })
                }
              />
              <TextAction
                title={t("share")}
                iconOnly
                icon="share-outline"
                disabled={!item.resources?.[0]?.[2]}
                onPress={() => {
                  const url = item.resources?.[0]?.[2];
                  if (url)
                    void Share.share({
                      message:
                        localized(item.title, profile.language) + " " + url,
                    });
                }}
              />
            </View>
          </Card>
        ))
      )}
      {category !== "news" && !loading && !visibleItems.length && (
        <Body small>{designCopy(profile.language, "noResults")}</Body>
      )}
    </Screen>
  );
}
