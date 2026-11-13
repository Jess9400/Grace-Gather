import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Text, View } from "react-native";
import { useApp } from "../lib/state";
import { useCommunity } from "../lib/discussion-state";
import { canReadPost, visibleTopics } from "../lib/discussion-model";
import { friendCopy } from "../lib/friends-copy";
import { Body, Button, Notice, colors } from "./quiet-ui";
import { TextAction } from "./CommunityControls";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { CelestialAvatar } from "./MemberAvatar";
import { avatarVariant } from "../lib/avatar";
import DiscussionVerse from "./DiscussionVerse";
import { TranslatedText } from "./TranslatedText";
import {
  translationCopy,
  useConversationTranslations,
} from "../lib/conversation-translations";

export default function PublicDiscussions({ query }: { query: string }) {
  const { profile } = useApp();
  const c = (key: string) => friendCopy(profile.language, key);
  const tr = useInterfaceCopy();
  const { state, userId, error, reload, loadMore, hasMore, loadingMore } =
    useCommunity();
  const loadedCount = useRef(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadedCount.current = state.topics.length;
  }, [state.topics.length]);
  const term = query.trim();
  const topics = visibleTopics(state);
  const translatedItems = topics.flatMap((topic) => [
    { id: `title:${topic.id}`, text: topic.title },
    { id: `body:${topic.id}`, text: topic.body },
    ...topic.replies
      .filter((reply) => canReadPost(state, reply))
      .slice(-2)
      .map((reply) => ({ id: `reply:${reply.id}`, text: reply.body })),
  ]);
  const { translations, unavailable } = useConversationTranslations(
    translatedItems,
    profile.language,
  );
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      setLoading(true);
      void reload(undefined, true, term).finally(() => {
        if (active) setLoading(false);
      });
      const timer = setInterval(() => {
        if (loadedCount.current <= 20) void reload(undefined, true, term);
      }, 30000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [reload, term, userId]),
  );
  if (!userId)
    return (
      <>
        <Body>{c("Sign in to take part in discussions.")}</Body>
        <Button title={c("Sign in")} onPress={() => router.push("/sign-in")} />
      </>
    );
  return (
    <>
      <TextAction
        title={c("Start a discussion")}
        icon="create-outline"
        onPress={() =>
          router.push({ pathname: "/friends", params: { compose: "1" } })
        }
      />
      <Notice text={error ? tr(error) : ""} />
      {!!topics.length && (
        <Body small>
          {translationCopy(
            profile.language,
            unavailable ? "unavailable" : "notice",
          )}
        </Body>
      )}
      {loading && <Body small>{c("Loading discussions…")}</Body>}
      {!loading &&
        topics.map((topic) => {
          const replies = topic.replies.filter((reply) =>
            canReadPost(state, reply),
          );
          return (
            <View
              key={topic.id}
              style={{
                paddingVertical: 20,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
                gap: 10,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <CelestialAvatar
                  variant={avatarVariant(topic.author)}
                  size={34}
                />
                <Text
                  style={{ fontSize: 13, color: colors.muted, flexShrink: 1 }}
                >
                  {topic.name}
                </Text>
              </View>
              <TranslatedText
                heading
                language={profile.language}
                original={topic.title}
                translation={translations[`title:${topic.id}`]}
                style={{
                  fontSize: 20,
                  lineHeight: 28,
                  fontWeight: "600",
                  color: colors.ink,
                }}
              />
              <TranslatedText
                language={profile.language}
                original={topic.body}
                translation={translations[`body:${topic.id}`]}
                style={{ fontSize: 16, lineHeight: 24, color: colors.ink }}
              />
              <DiscussionVerse
                id={topic.verseId}
                reference={topic.reference}
                fallbackTitle={topic.title}
                compact
              />
              {replies.slice(-2).map((reply) => (
                <View
                  key={reply.id}
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    paddingLeft: 12,
                    alignItems: "baseline",
                  }}
                >
                  <Text
                    style={{
                      color: colors.ink,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    {reply.name}
                  </Text>
                  <TranslatedText
                    fill
                    lines={2}
                    language={profile.language}
                    original={reply.body}
                    translation={translations[`reply:${reply.id}`]}
                    style={{
                      color: colors.ink,
                      fontSize: 15,
                      lineHeight: 22,
                      flex: 1,
                      minWidth: 0,
                    }}
                  />
                </View>
              ))}
              <TextAction
                title={c("Join discussion")}
                icon="chatbubble-outline"
                onPress={() =>
                  router.push({
                    pathname: "/friends",
                    params: { topic: topic.id, from: "discover" },
                  })
                }
              />
            </View>
          );
        })}
      {!loading && !topics.length && !error && (
        <Body>
          {c(
            term.length >= 2
              ? "No matching discussions found."
              : "No discussions yet. Start the first one.",
          )}
        </Body>
      )}
      {term.length === 1 && (
        <Body small>
          {c("Enter at least two characters to search discussions.")}
        </Body>
      )}
      {!loading && hasMore && (
        <TextAction
          title={c("More discussions")}
          disabled={loadingMore}
          onPress={() => void loadMore()}
        />
      )}
    </>
  );
}
