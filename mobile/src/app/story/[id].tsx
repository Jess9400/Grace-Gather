import { interfaceCopy } from "../../lib/interface-copy";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CelestialAvatar } from "../../components/MemberAvatar";
import { avatarVariant } from "../../lib/avatar";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Button,
  Notice,
  External,
  Busy,
  colors,
} from "../../components/community-ui";
import { StoryActions } from "../../components/DiscoverPost";
import { Disclosure, TextAction } from "../../components/CommunityControls";
import { useApp } from "../../lib/state";
import { copy, data } from "../../lib/content";
import { label } from "../../lib/labels";
import { backend, requireUser } from "../../lib/backend";
import {
  Story as StoryData,
  storyText,
  useInteractions,
} from "../../lib/discover";
import { communityCopy } from "../../lib/community-copy";
import {
  isPortugueseDiscoverStory,
  isReadableBrazilianPublisher,
} from "../../lib/discover-language";
import {
  translationCopy,
  useConversationTranslations,
} from "../../lib/conversation-translations";
import { TranslatedText } from "../../components/TranslatedText";
interface Comment {
  id: string;
  user_id: string;
  alias: string;
  body: string;
  status: string;
  created_at: string;
}
export default function Story() {
  const { id, comments: jump } = useLocalSearchParams<{
      id: string;
      comments?: string;
    }>(),
    { profile } = useApp();
  const t = (k: string) => copy(profile.language, k),
    l = (k: string) => label(profile.language, k),
    c = (k: string) => communityCopy(profile.language, k);
  const [item, setItem] = useState<StoryData | null>(null),
    [loading, setLoading] = useState(true),
    [related, setRelated] = useState<StoryData[]>([]),
    [readError, setReadError] = useState(""),
    [publisherPages, setPublisherPages] = useState<string[]>([]),
    [publisherLoading, setPublisherLoading] = useState(false),
    [publisherError, setPublisherError] = useState(false),
    [publisherRetry, setPublisherRetry] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]),
    [uid, setUid] = useState(""),
    [commentError, setCommentError] = useState(""),
    [body, setBody] = useState(""),
    [alias, setAlias] = useState(profile.name),
    [notice, setNotice] = useState(""),
    [editAlias, setEditAlias] = useState(!profile.name),
    [commentMenu, setCommentMenu] = useState<string | null>(null),
    [storyReportNotice, setStoryReportNotice] = useState(""),
    [report, setReport] = useState<{ comment: string | null } | null>(null),
    [busy, setBusy] = useState(false);
  const interactions = useInteractions([id]),
    scroll = useRef<React.ComponentRef<typeof ScrollView>>(null),
    jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    commentsY = useRef(0),
    jumped = useRef(false);
  const commentTranslations = useConversationTranslations(
    comments
      .filter((comment) => comment.user_id !== uid)
      .map((comment) => ({ id: comment.id, text: comment.body })),
    profile.language,
  );
  useEffect(() => {
    jumped.current = false;
  }, [id, jump]);
  useEffect(() => {
    if (loading || !item || jump !== "1" || jumped.current) return;
    jumpTimer.current = setTimeout(() => {
      if (Platform.OS === "web") {
        document
          .getElementById("story-comments")
          ?.scrollIntoView({ block: "start" });
      } else {
        scroll.current?.scrollTo({ y: commentsY.current, animated: false });
      }
      jumped.current = true;
    }, 600);
  }, [loading, item, jump]);
  useEffect(
    () => () => {
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
    },
    [],
  );
  const loadStory = useCallback(async () => {
    setLoading(true);
    setReadError("");
    try {
      if (!backend) throw Error("unavailable");
      const r = await backend
        .from("content_items")
        .select("data")
        .eq("id", id)
        .eq("published", true)
        .maybeSingle();
      if (r.error) throw r.error;
      setItem(r.data?.data ?? null);
      if (r.data) {
        const related = await backend
          .from("content_items")
          .select("data")
          .eq("kind", "feed")
          .eq("published", true)
          .eq("data->>type", r.data.data.type ?? "stories")
          .neq("id", id)
          .order("sort_at", { ascending: false })
          .limit(3);
        setRelated((related.data ?? []).map((x) => x.data));
      }
    } catch {
      setReadError("storyLoadError");
    } finally {
      setLoading(false);
    }
  }, [id]);
  const reloadComments = useCallback(async () => {
    if (!backend) return;
    setCommentError("");
    const {
      data: { session },
    } = await backend.auth.getSession();
    setUid(session?.user.id ?? "");
    if (!session) {
      setComments([]);
      return;
    }
    const r = await backend
      .from("comments")
      .select("id,user_id,alias,body,status,created_at")
      .eq("item_id", id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (r.error) {
      setCommentError("commentsLoadError");
      return;
    }
    setComments(r.data ?? []);
  }, [id]);
  useEffect(() => {
    void Promise.resolve().then(loadStory);
    void Promise.resolve().then(reloadComments);
    const s = backend?.auth.onAuthStateChange(() => {
      setTimeout(() => void reloadComments(), 0);
    });
    return () => s?.data.subscription.unsubscribe();
  }, [loadStory, reloadComments]);
  const inlinePublisher = item ? isReadableBrazilianPublisher(item) : false;
  useEffect(() => {
    let active = true;
    if (!backend || item?.origin !== "publisher" || item.id !== id) return;
    if (inlinePublisher) return;
    const client = backend;
    void Promise.resolve()
      .then(() => {
        if (!active) return null;
        setPublisherPages([]);
        setPublisherError(false);
        setPublisherLoading(true);
        return client.functions.invoke("story-reader", { body: { id } });
      })
      .then((result) => {
        if (!active || !result) return;
        const { data, error } = result;
        if (
          error ||
          !Array.isArray(data?.pages) ||
          !data.pages.length ||
          !data.pages.every((page: unknown) => typeof page === "string")
        ) {
          setPublisherError(true);
        } else {
          setPublisherPages(data.pages);
        }
      })
      .catch(() => {
        if (active) setPublisherError(true);
      })
      .finally(() => {
        if (active) setPublisherLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, item?.id, item?.origin, inlinePublisher, publisherRetry]);
  async function act(fn: () => Promise<void>, isStoryReport = false) {
    setBusy(true);
    setNotice("");
    if (isStoryReport) setStoryReportNotice("");
    try {
      await fn();
      await reloadComments();
      await interactions.reload();
    } catch {
      if (isStoryReport) setStoryReportNotice(c("actionError"));
      else setNotice(c("actionError"));
    } finally {
      setBusy(false);
    }
  }
  function reportForm(commentId: string | null) {
    return (
      <Card>
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.ink }}>
          {l("report")}
        </Text>
        {["abuse", "harm", "spam", "rights", "other"].map((reason) => (
          <TextAction
            key={reason}
            disabled={busy}
            title={c(reason)}
            onPress={() =>
              void act(async () => {
                const { client } = await requireUser();
                const result = await client.rpc("report_content", {
                  p_item: id,
                  p_comment: commentId,
                  p_reason: reason,
                  p_detail: "",
                });
                if (result.error) throw result.error;
                setReport(null);
                if (commentId === null) setStoryReportNotice(l("reported"));
                else setNotice(l("reported"));
              }, commentId === null)
            }
          />
        ))}
        <TextAction title={t("cancel")} onPress={() => setReport(null)} />
      </Card>
    );
  }
  if (loading)
    return (
      <Screen back>
        <Busy />
      </Screen>
    );
  if (readError)
    return (
      <Screen back>
        <Notice text={c(readError)} />
        <Button title={l("retry")} onPress={() => void loadStory()} />
      </Screen>
    );
  if (!item || (item.tradition && item.tradition !== profile.tradition))
    return (
      <Screen back>
        <Body>{l("notFound")}</Body>
      </Screen>
    );
  const psalm =
    id === "psalm-23"
      ? data.PSALM23[profile.edition as keyof typeof data.PSALM23]
      : null;
  return (
    <Screen back keyboardAware scrollRef={scroll}>
      <Body small>
        {item.origin === "community"
          ? c("communityTestimony")
          : item.origin === "publisher"
            ? c("publisherStory")
            : item.origin === "news"
              ? c("news")
              : item.origin === "editorial"
                ? c("editorial")
                : item.type === "stories"
                  ? c("historical")
                  : c("reflection")}{" "}
        · {item.source}
        {item.origin === "publisher" && item.author ? ` · ${item.author}` : ""}
      </Body>
      {(!item.title?.[profile.language] ||
        !item.summary?.[profile.language] ||
        (item.body && !item.body[profile.language])) && (
        <Body small>
          {interfaceCopy(
            profile.language,
            "Translation is not available for this item. The original text is shown.",
          )}
        </Body>
      )}
      <Heading>{storyText(item.title, profile.language)}</Heading>
      {!!item.publishedAt && (
        <Body small>
          {c("published")}{" "}
          {new Date(item.publishedAt).toLocaleString(profile.language)}
          {item.eventDate
            ? " · " +
              c("eventDate") +
              " " +
              new Date(item.eventDate).toLocaleDateString(profile.language, {
                timeZone: "UTC",
              })
            : ""}
        </Body>
      )}
      {item.origin === "news" && item.summaryKind === "Publisher excerpt" && (
        <Body small>
          {c("publisherExcerpt")}
          {item.author ? " · " + item.author : ""}
        </Body>
      )}
      {item.origin === "community" && (
        <Body small>{c("personalExperience")}</Body>
      )}
      {inlinePublisher && item.body?.pt ? (
        <>
          <Card>
            {item.body.pt
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((paragraph, index) => (
                <Body key={index}>{paragraph}</Body>
              ))}
          </Card>
          {!!item.url && /^https:\/\//.test(item.url) && (
            <TextAction
              title={c("openOriginal")}
              icon="open-outline"
              onPress={() => void Linking.openURL(item.url!)}
            />
          )}
        </>
      ) : item.origin === "publisher" ? (
        <>
          {publisherLoading && <Busy />}
          {publisherError && (
            <>
              <Body small>{c("publisherUnavailable")}</Body>
              <TextAction
                title={l("retry")}
                onPress={() => setPublisherRetry((n) => n + 1)}
              />
            </>
          )}
          {publisherPages.length > 0 && (
            <Card>
              {publisherPages.map((page, index) => (
                <Body key={index}>{page}</Body>
              ))}
            </Card>
          )}
          {!!item.url &&
            /^https:\/\/christianfaithstories\.org\/wp-content\/uploads\/\d{4}\/\d{2}\/[a-z0-9%._-]+\.pdf$/i.test(
              item.url,
            ) && (
              <TextAction
                title={c("openOriginal")}
                icon="open-outline"
                onPress={() => void Linking.openURL(item.url!)}
              />
            )}
        </>
      ) : (
        <Card>
          {item.origin === "community" ? (
            <Body>{storyText(item.body, profile.language)}</Body>
          ) : (
            <>
              {storyText(item.summary, profile.language) !==
                storyText(item.body, profile.language) && (
                <Body>{storyText(item.summary, profile.language)}</Body>
              )}
              {storyText(item.body, profile.language)
                .split(/\n\s*\n/)
                .filter(Boolean)
                .map((paragraph, index) => (
                  <Body key={index}>{paragraph}</Body>
                ))}
            </>
          )}
        </Card>
      )}
      {!!item.reflection && <Body>{item.reflection}</Body>}
      {psalm && (
        <Card>
          <Subheading>{psalm.reference}</Subheading>
          {psalm.verses.map((v, i) => (
            <Body key={i}>
              {i + 1}. {v}
            </Body>
          ))}
          <External title={t("source")} url={psalm.source} />
        </Card>
      )}
      {item.origin !== "publisher" && !!item.resources?.length && (
        <View style={{ gap: 2, paddingVertical: 4 }}>
          <Text
            style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}
          >
            {interfaceCopy(profile.language, "Watch, listen and explore")}
          </Text>
          {item.resources.map(([kind, title, url]) => (
            <TextAction
              key={url}
              icon="open-outline"
              title={`${interfaceCopy(
                profile.language,
                kind === "watch"
                  ? "Watch"
                  : kind === "listen"
                    ? "Listen"
                    : kind === "study"
                      ? "Study"
                      : kind === "pray"
                        ? "Prayer"
                        : "Read",
              )} · ${title}`}
              onPress={() => {
                if (/^https:\/\//.test(url) || url.startsWith("mailto:"))
                  void Linking.openURL(url);
              }}
            />
          ))}
          {!!item.license && (
            <>
              <Body small>{item.license}</Body>
              {!!item.licenseUrl && (
                <External title={c("reuseTerms")} url={item.licenseUrl} />
              )}
            </>
          )}
          {!!item.retrievedAt && (
            <Body small>
              {c("retrieved")}{" "}
              {new Date(item.retrievedAt).toLocaleString(profile.language)}
            </Body>
          )}
        </View>
      )}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingTop: 4,
        }}
      >
        <StoryActions
          item={item}
          interactions={interactions}
          showComment={false}
        />
      </View>
      <Notice text={interactions.error} />
      <View
        nativeID="story-comments"
        onLayout={(e) => {
          commentsY.current = e.nativeEvent.layout.y;
        }}
      >
        <Subheading>{c("commentsHeading")}</Subheading>
      </View>
      <Notice text={notice} />
      <Notice text={commentError ? c(commentError) : ""} />
      {!!comments.length && (
        <Body small>
          {translationCopy(
            profile.language,
            commentTranslations.unavailable ? "unavailable" : "notice",
          )}
        </Body>
      )}
      {!!commentError && (
        <Button
          secondary
          title={l("retry")}
          onPress={() => void reloadComments()}
        />
      )}
      {!uid ? (
        <TextAction
          title={l("signInCommunity")}
          onPress={() => router.push("/sign-in")}
        />
      ) : (
        <View style={{ gap: 10 }}>
          <View
            style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
          >
            <View
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CelestialAvatar variant={avatarVariant(uid)} size={36} />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              {(editAlias || !alias.trim()) && (
                <TextInput
                  accessibilityLabel={t("displayName")}
                  placeholder={t("displayName")}
                  placeholderTextColor={colors.muted}
                  value={alias}
                  onChangeText={setAlias}
                  maxLength={40}
                  style={{
                    color: colors.ink,
                    fontSize: 14,
                    fontWeight: "600",
                    paddingVertical: 4,
                  }}
                />
              )}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  backgroundColor: colors.pale,
                  borderRadius: 20,
                  paddingLeft: 14,
                }}
              >
                <TextInput
                  accessibilityLabel={c("commentPrompt")}
                  placeholder={c("commentPrompt")}
                  placeholderTextColor={colors.muted}
                  value={body}
                  onChangeText={setBody}
                  multiline
                  maxLength={600}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    maxHeight: 140,
                    paddingVertical: 11,
                    color: colors.ink,
                    fontSize: 16,
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("postComment")}
                  disabled={busy || !body.trim() || !alias.trim()}
                  style={{
                    width: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: busy || !body.trim() || !alias.trim() ? 0.35 : 1,
                  }}
                  onPress={() =>
                    void act(async () => {
                      const { client } = await requireUser();
                      const r = await client.rpc("post_comment", {
                        p_item: id,
                        p_alias: alias,
                        p_body: body,
                      });
                      if (r.error) throw r.error;
                      setBody("");
                      setNotice(l("pending"));
                    })
                  }
                >
                  <Ionicons
                    name="arrow-up-circle"
                    size={28}
                    color={colors.ink}
                  />
                </Pressable>
              </View>
              {!!body.trim() && !editAlias && !!alias.trim() && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t("displayName")}: ${alias}`}
                  onPress={() => setEditAlias(true)}
                  style={{
                    alignSelf: "flex-start",
                    minHeight: 32,
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {alias} · ✎
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}
      {comments.map((comment) => (
        <View
          key={comment.id}
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
        >
          <CelestialAvatar variant={avatarVariant(comment.user_id)} size={36} />
          <View style={{ flex: 1, gap: 5 }}>
            <View
              style={{
                backgroundColor: colors.pale,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 16,
                gap: 4,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.ink,
                    flexShrink: 1,
                  }}
                >
                  {comment.alias}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={c("commentOptions")}
                  onPress={() =>
                    setCommentMenu(
                      commentMenu === comment.id ? null : comment.id,
                    )
                  }
                  hitSlop={10}
                  style={{ padding: 6 }}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
              <TranslatedText
                original={comment.body}
                translation={commentTranslations.translations[comment.id]}
                language={profile.language}
                style={{ fontSize: 15, lineHeight: 22, color: colors.ink }}
              />
            </View>
            <Body small>
              {new Date(comment.created_at).toLocaleDateString(
                profile.language,
              )}
              {comment.status === "pending" ? " · " + l("pending") : ""}
            </Body>
            {commentMenu === comment.id && (
              <View>
                {comment.user_id === uid ? (
                  <Button
                    secondary
                    title={t("removeComment")}
                    disabled={busy}
                    onPress={() =>
                      void act(async () => {
                        const { client } = await requireUser();
                        const r = await client
                          .from("comments")
                          .delete()
                          .eq("id", comment.id);
                        if (r.error) throw r.error;
                      })
                    }
                  />
                ) : (
                  <>
                    <Button
                      secondary
                      title={l("report")}
                      onPress={() => setReport({ comment: comment.id })}
                    />
                    <Button
                      secondary
                      title={l("block")}
                      disabled={busy}
                      onPress={() =>
                        void act(async () => {
                          const { client, user } = await requireUser();
                          const r = await client.from("blocks").upsert(
                            {
                              user_id: user.id,
                              blocked_user_id: comment.user_id,
                            },
                            {
                              onConflict: "user_id,blocked_user_id",
                              ignoreDuplicates: true,
                            },
                          );
                          if (r.error) throw r.error;
                        })
                      }
                    />
                  </>
                )}
              </View>
            )}
            {report?.comment === comment.id && reportForm(comment.id)}
          </View>
        </View>
      ))}
      {related.some(
        (x) =>
          (profile.language !== "pt" || isPortugueseDiscoverStory(x)) &&
          (!x.tradition || x.tradition === profile.tradition),
      ) && (
        <>
          <Subheading>{c("related")}</Subheading>
          {related
            .filter(
              (x) => profile.language !== "pt" || isPortugueseDiscoverStory(x),
            )
            .filter((x) => !x.tradition || x.tradition === profile.tradition)
            .map((story) => (
              <TextAction
                key={story.id}
                title={storyText(story.title, profile.language)}
                icon="arrow-forward"
                onPress={() =>
                  router.push({
                    pathname: "/story/[id]",
                    params: { id: story.id },
                  })
                }
              />
            ))}
        </>
      )}
      <Disclosure title={c("guidelines")}>
        <Body small>{l("communityRules")}</Body>
        <TextAction
          title={l("report")}
          icon="flag-outline"
          onPress={() => {
            setStoryReportNotice("");
            if (uid) setReport({ comment: null });
            else router.push("/sign-in");
          }}
        />
        {report && report.comment === null && reportForm(null)}
        <Notice text={storyReportNotice} />
      </Disclosure>
    </Screen>
  );
}
