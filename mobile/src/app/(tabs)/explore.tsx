import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Share } from "react-native";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Row,
  Chip,
  Button,
  Field,
  Notice,
  External,
  Busy,
} from "../../components/quiet-ui";
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
  return (
    <Screen>
      <Heading>{t("exploreHeading")}</Heading>
      <Body>{t("exploreIntro")}</Body>
      <Field
        label={t("searchExplore")}
        value={search}
        onChangeText={setSearch}
      />
      <Row>
        {["all", "stories", "music", "psalms", "prayers", "bible", "news"].map(
          (c) => (
            <Chip
              key={c}
              title={t(c)}
              selected={c === category}
              onPress={() => router.setParams({ category: c })}
            />
          ),
        )}
      </Row>
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
              <Body small>
                {new Date(n.published).toLocaleString(profile.language)}
              </Body>
              <Subheading>{n.title}</Subheading>
              <Body>{n.summary}</Body>
              <External title={t("readStory")} url={n.url} />
              <Button
                secondary
                title={t("share")}
                onPress={() => {
                  void Share.share({ message: n.title + " " + n.url });
                }}
              />
            </Card>
          ))}
        </>
      ) : (
        items
          .filter(
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
          )
          .map((item) => (
            <Card key={item.id}>
              <Body small>{item.source}</Body>
              <Subheading>{localized(item.title, profile.language)}</Subheading>
              <Body>{localized(item.summary, profile.language)}</Body>
              <Row>
                {item.tags?.map((tag) => (
                  <Chip
                    key={tag}
                    title={t(tag)}
                    onPress={() => setSearch(t(tag))}
                  />
                ))}
              </Row>
              <Row>
                <Button
                  secondary
                  disabled={reactions.pending.includes(item.id)}
                  title={
                    t(reactions.liked.includes(item.id) ? "liked" : "like") +
                    " " +
                    (reactions.counts[item.id] || "")
                  }
                  onPress={() => {
                    void reactions.toggle(item.id).then((authorized) => {
                      if (!authorized) router.push("/account");
                    });
                  }}
                />
                <Button
                  secondary
                  title={t("readMore")}
                  onPress={() =>
                    router.push({
                      pathname: "/story/[id]",
                      params: { id: item.id },
                    })
                  }
                />
                <Button
                  secondary
                  title={t("comment")}
                  onPress={() =>
                    router.push({
                      pathname: "/story/[id]",
                      params: { id: item.id },
                    })
                  }
                />
                <Button
                  secondary
                  title={t("share")}
                  onPress={() => {
                    const url = item.resources?.[0]?.[2];
                    if (url)
                      void Share.share({
                        message:
                          localized(item.title, profile.language) + " " + url,
                      });
                  }}
                />
              </Row>
            </Card>
          ))
      )}
    </Screen>
  );
}
