import { interfaceCopy } from "../../lib/interface-copy";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Row,
  Button,
  Field,
  Notice,
  External,
  Chip,
  Busy,
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
interface Comment {
  id: string;
  user_id: string;
  alias: string;
  body: string;
  status: string;
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
    [readError, setReadError] = useState("");
  const [comments, setComments] = useState<Comment[]>([]),
    [uid, setUid] = useState(""),
    [commentError, setCommentError] = useState(""),
    [body, setBody] = useState(""),
    [alias, setAlias] = useState(profile.name),
    [agree, setAgree] = useState(false),
    [notice, setNotice] = useState(""),
    [report, setReport] = useState<{ comment: string | null } | null>(null),
    [busy, setBusy] = useState(false);
  const interactions = useInteractions([id]),
    scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
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
      .select("id,user_id,alias,body,status")
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
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
      await reloadComments();
      await interactions.reload();
    } catch {
      setNotice(c("actionError"));
    } finally {
      setBusy(false);
    }
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
          : item.origin === "news"
            ? c("news")
            : item.type === "stories"
              ? c("historical")
              : c("reflection")}{" "}
        · {item.source}
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
      <Card>
        {item.origin === "community" ? (
          <Body>{storyText(item.body, profile.language)}</Body>
        ) : (
          <>
            {storyText(item.summary, profile.language) !==
              storyText(item.body, profile.language) && (
              <Body>{storyText(item.summary, profile.language)}</Body>
            )}
            <Body>
              {storyText(item.body, profile.language) ||
                storyText(item.summary, profile.language)}
            </Body>
          </>
        )}
      </Card>
      {!!item.reflection && <Body>{item.reflection}</Body>}
      {item.origin !== "community" && !item.reflection && (
        <Body small>{c("reflectionQuestion")}</Body>
      )}
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
      <StoryActions item={item} interactions={interactions} />
      <Notice text={interactions.error || notice} />
      {!!item.resources?.length && (
        <Disclosure title={c("sources")}>
          {item.resources.map(([, title, url]) => (
            <External key={url} title={title} url={url} />
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
        </Disclosure>
      )}
      <TextAction
        title={l("report")}
        icon="flag-outline"
        onPress={() =>
          uid ? setReport({ comment: null }) : router.push("/account")
        }
      />
      {report && (
        <Card>
          <Subheading>{l("report")}</Subheading>
          {["abuse", "harm", "spam", "rights", "other"].map((reason) => (
            <Button
              key={reason}
              secondary
              disabled={busy}
              title={c(reason)}
              onPress={() =>
                void act(async () => {
                  const { client } = await requireUser();
                  const r = await client.rpc("report_content", {
                    p_item: id,
                    p_comment: report.comment,
                    p_reason: reason,
                    p_detail: "",
                  });
                  if (r.error) throw r.error;
                  setReport(null);
                  setNotice(l("reported"));
                })
              }
            />
          ))}
          <Button
            secondary
            title={t("cancel")}
            onPress={() => setReport(null)}
          />
        </Card>
      )}
      <View
        onLayout={(e) => {
          if (jump === "1")
            scroll.current?.scrollTo({
              y: e.nativeEvent.layout.y,
              animated: false,
            });
        }}
      >
        <Subheading>{t("commentsTitle")}</Subheading>
      </View>
      <Notice text={commentError ? c(commentError) : ""} />
      {!!commentError && (
        <Button
          secondary
          title={l("retry")}
          onPress={() => void reloadComments()}
        />
      )}
      {!uid ? (
        <Button
          title={l("signInCommunity")}
          onPress={() => router.push("/account")}
        />
      ) : (
        <Card>
          <Body small>{l("communityRules")}</Body>
          <Field
            label={t("displayName")}
            value={alias}
            onChangeText={setAlias}
            maxLength={40}
          />
          <Field
            label={t("commentPlaceholder")}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={600}
          />
          <Chip
            title={l("agree")}
            selected={agree}
            onPress={() => setAgree(!agree)}
          />
          <Button
            title={t("postComment")}
            disabled={busy || !agree || !body.trim() || !alias.trim()}
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
          />
        </Card>
      )}
      {comments.map((comment) => (
        <Card key={comment.id}>
          <Subheading>{comment.alias}</Subheading>
          <Body>{comment.body}</Body>
          {comment.status === "pending" && <Body small>{l("pending")}</Body>}
          <Row>
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
          </Row>
        </Card>
      ))}
      {!!related.length && (
        <>
          <Subheading>{c("related")}</Subheading>
          {related
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
    </Screen>
  );
}
