import { TextAction } from "../components/CommunityControls";
import {
  getStudyDiscussionTopic,
  getStudyDiscussionRevision,
  clearStudyDiscussionTopic,
} from "../lib/study-discussion-draft";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ChurchStrip, { useRoomStrip } from "../components/ChurchStrip";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Button,
  Card,
  Chip,
  Field,
  Notice,
  Row,
  colors,
  serif,
} from "../components/quiet-ui";
import Disclosure from "../components/Disclosure";
import { useCommunity } from "../lib/discussion-state";
import {
  perspectives,
  canReadPost,
  visibleTopics,
  type Post,
  type Perspective,
  type DiscussionAction,
} from "../lib/discussion-model";
import { getReadingVerse, discussionVerseId } from "../lib/bible";

type ViewMode = "list" | "thread" | "compose" | "review";
type CommunityProps = {
  header?: ReactNode;
  search?: string;
  feed?: boolean;
  review?: boolean;
};
export default function Community({
  header,
  search = "",
  feed = false,
  review = false,
}: CommunityProps = {}) {
  const { userId } = useCommunity();
  return (
    <CommunityScreen
      key={userId ?? "signed-out"}
      header={header}
      search={search}
      feed={feed}
      review={review}
    />
  );
}
function CommunityScreen({
  header,
  search = "",
  feed = false,
  review = false,
}: CommunityProps) {
  const tr = useInterfaceCopy();
  const params = useLocalSearchParams<{
    verse?: string;
    compose?: string;
  }>();
  const linkedVerse =
    !feed && params.verse ? discussionVerseId(params.verse) : null;
  const verse = linkedVerse ? getReadingVerse(linkedVerse) : null;
  const {
    state,
    demo,
    automatic,
    connected,
    userId,
    moderator,
    busy,
    error,
    reload,
    loadMore,
    hasMore,
    loadingMore,
    perform,
    screen,
    moderate,
  } = useCommunity();
  const [alias, setAlias] = useState("");
  const [mode, setMode] = useState<ViewMode>(
      review ? "review" : !feed && params.compose === "1" ? "compose" : "list",
    ),
    [selected, setSelected] = useState<string | null>(null);
  // The Chats list opens with its strip of the church (behind the side door);
  // a conversation or the composer keeps the plain header for space.
  const chatsStrip = useRoomStrip("chats") && mode === "list" && feed;
  const [filter, setFilter] = useState<"all" | "verse" | "mine" | "engaged">(
    verse ? "verse" : feed ? "all" : "engaged",
  );
  const [title, setTitle] = useState(
      params.compose === "1" ? getStudyDiscussionTopic() : "",
    ),
    [body, setBody] = useState(""),
    [reply, setReply] = useState("");
  const [perspective, setPerspective] =
    useState<Perspective>("Open discussion");
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const draftRevision = getStudyDiscussionRevision();
  const appliedDraft = useRef(-1);
  useEffect(() => {
    if (
      feed ||
      params.compose !== "1" ||
      appliedDraft.current === draftRevision
    )
      return;
    appliedDraft.current = draftRevision;
    setTitle(getStudyDiscussionTopic());
    setBody("");
    setMode("compose");
    setPreviewKey(null);
  }, [params.compose, draftRevision, feed]);
  const currentPreviewKey = JSON.stringify([
    title,
    body,
    alias,
    perspective,
    filter,
    verse?.id,
  ]);
  const [notice, setNotice] = useState(""),
    [actionsFor, setActionsFor] = useState<string | null>(null),
    [reportReason, setReportReason] = useState("");
  useEffect(() => {
    void reload(mode === "thread" ? (selected ?? undefined) : undefined, feed);
  }, [reload, selected, userId, feed, mode]);
  const own = (post: Post) => post.author === userId;
  async function act(action: DiscussionAction, success?: () => void) {
    if (await perform(action, demo ? "You" : alias)) success?.();
  }
  const canPost = !busy && !!userId && (demo || !!alias.trim());
  const [removing, setRemoving] = useState<string | null>(null);
  const topic = state.topics.find((t) => t.id === selected);
  const readable = topic && canReadPost(state, topic);
  const allPosts = state.topics.flatMap((t) => [t, ...t.replies]);
  const pending = allPosts.filter((p) => p.status === "pending");
  const reports = state.reports.filter((r) => !r.resolved);
  const mine = allPosts.filter((p) => own(p));
  const topics = visibleTopics(
    state,
    filter === "verse" ? verse?.id : undefined,
  )
    .filter(
      (topic) => filter !== "engaged" || own(topic) || topic.replies.some(own),
    )
    .filter((topic) =>
      `${topic.title} ${topic.body} ${topic.reference ?? ""}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
    );
  const goList = () => {
    setMode("list");
    setActionsFor(null);
  };
  const openThread = (id: string) => {
    setSelected(id);
    setMode("thread");
    setNotice("");
    setActionsFor(null);
  };
  const startTopic = () => {
    if (!userId) {
      router.push("/account");
      return;
    }
    setTitle("");
    setBody("");
    setPerspective("Open discussion");
    setNotice("");
    setMode("compose");
  };
  const statusLabel = (p: Post) =>
    p.status === "pending"
      ? tr("Awaiting a safety check or held")
      : p.status === "removed"
        ? tr("Not published")
        : demo
          ? tr("Published in this preview")
          : tr("Published");
  const postContext = (p: Post) =>
    state.topics.find((t) => t.id === p.id)?.title ??
    `${tr("Reply to")} ${state.topics.find((t) => t.replies.some((r) => r.id === p.id))?.title ?? "a conversation"}`;
  function OwnRemoval(post: Post) {
    if (!own(post)) return null;
    return removing === post.id ? (
      <View style={{ gap: 10 }}>
        <Body small>
          {tr("Remove this post? Removing a topic also removes its replies.")}
        </Body>
        <Button
          secondary
          disabled={busy}
          title={tr("Confirm removal")}
          onPress={() =>
            void act({ type: "delete", postId: post.id }, () => {
              setRemoving(null);
              setNotice(tr("Your post was removed."));
            })
          }
        />
        <Button
          secondary
          title={tr("Keep post")}
          onPress={() => setRemoving(null)}
        />
      </View>
    ) : (
      <Button
        secondary
        disabled={busy}
        title={tr("Remove your post")}
        onPress={() => setRemoving(post.id)}
      />
    );
  }
  function PostActions({ post }: { post: Post }) {
    if (own(post)) return null;
    return (
      <View>
        {actionsFor === post.id && (
          <View style={s.actionPanel}>
            <Text style={s.label}>{tr("Report this post")}</Text>
            <Field
              label={tr("Reason for report")}
              value={reportReason}
              onChangeText={setReportReason}
              placeholder={tr("Tell us what concerns you")}
              maxLength={300}
            />
            <Button
              title={tr("Send report")}
              disabled={!reportReason.trim() || busy}
              onPress={() =>
                void act(
                  {
                    type: "report",
                    postId: post.id,
                    reason: reportReason.trim(),
                  },
                  () => {
                    setActionsFor(null);
                    setNotice(
                      tr(
                        "Report sent for review. This post is hidden for you.",
                      ),
                    );
                  },
                )
              }
            />
            <Button
              secondary
              title={`${tr("Block")} ${post.name}`}
              disabled={busy}
              onPress={() =>
                void act({ type: "block", author: post.author }, () => {
                  setActionsFor(null);
                  setNotice(
                    tr(
                      "Posts and replies from this person are hidden for you. You can undo this below.",
                    ),
                  );
                })
              }
            />
          </View>
        )}
      </View>
    );
  }
  function PublicPost({
    post,
    opening = false,
    title,
    children,
  }: {
    post: Post;
    opening?: boolean;
    title?: string;
    children?: ReactNode;
  }) {
    return (
      <Card>
        <View style={s.authorLine}>
          <View style={s.avatar}>
            <Text style={s.initial}>{post.name.slice(0, 1)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.author}>{post.name}</Text>
            <Text style={s.small}>
              {own(post)
                ? demo
                  ? tr("Local preview submission")
                  : tr("Your post")
                : demo
                  ? tr("Example conversation")
                  : tr("Community member")}
            </Text>
          </View>
          {!own(post) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${tr("Options for")} ${post.name}`}
              onPress={() => {
                setActionsFor(actionsFor === post.id ? null : post.id);
                setReportReason("");
              }}
              style={s.options}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={colors.muted}
              />
            </Pressable>
          )}
        </View>
        {post.perspective !== "Open discussion" && (
          <Text style={s.tag}>{tr(post.perspective)}</Text>
        )}
        {(title || (opening && topic)) && (
          <Text accessibilityRole="header" style={s.threadTitle}>
            {title ?? topic?.title}
          </Text>
        )}
        <Body>{post.body}</Body>
        {OwnRemoval(post)}
        {actionsFor === post.id && PostActions({ post })}
        {children}
      </Card>
    );
  }
  if (!feed && params.compose === "1" && !userId) {
    return (
      <Screen back>
        <Heading>{tr("Create a discussion")}</Heading>
        <Body>
          {tr(
            "Sign in to start your discussion. Your topic will wait here until you return.",
          )}
        </Body>
        <Button
          title={tr("Account and sign in")}
          onPress={() => router.push("/account")}
        />
      </Screen>
    );
  }
  return (
    <SafeAreaView
      style={s.safe}
      edges={
        chatsStrip && !header
          ? ["bottom", "left", "right"]
          : ["top", "bottom", "left", "right"]
      }
    >
      {!header && chatsStrip && <ChurchStrip place="chats" back />}
      {!header && !chatsStrip && (
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Back")}
            style={s.back}
            onPress={() =>
              mode !== "list"
                ? goList()
                : router.canGoBack()
                  ? router.back()
                  : router.replace("/(tabs)/more")
            }
          >
            <Ionicons name="chevron-back" size={21} color={colors.ink} />
            <Text style={s.backText}>{tr("Back")}</Text>
          </Pressable>
          <Text style={s.brand}>GRACE & GATHER</Text>
          <Ionicons name="leaf-outline" size={21} color={colors.gold} />
        </View>
      )}
      <ScrollView
        key={`${mode}-${selected ?? ""}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.page}
      >
        {header}
        {header && mode !== "list" && (
          <TextAction
            icon="chevron-back"
            title={tr("Back to discussions")}
            onPress={goList}
          />
        )}
        {(!feed || demo) && (
          <View style={s.preview}>
            <Ionicons
              name={demo ? "flask-outline" : "people-outline"}
              size={15}
              color={colors.goldInk}
            />
            <Text style={s.small}>
              {demo
                ? tr(
                    "Community preview · sample conversations · nothing is public",
                  )
                : tr("Community · questions and reflections")}
            </Text>
          </View>
        )}
        <Notice text={error || notice} />
        {!demo && (!connected || !userId) && (
          <Card>
            <Body>
              {connected
                ? tr("Sign in to join the conversation.")
                : tr("Community is not connected on this build yet.")}
            </Body>
            {!feed && (
              <Body small>
                {tr(
                  "Your private diary stays separate. Only the words you choose to post are shared.",
                )}
              </Body>
            )}
            <Button
              secondary
              title={tr("Account and sign in")}
              onPress={() => router.push("/account")}
            />
          </Card>
        )}
        {!feed && !demo && userId && (
          <TextAction
            icon="refresh-outline"
            disabled={busy}
            title={tr("Refresh")}
            onPress={() =>
              void reload(
                mode === "thread" ? (selected ?? undefined) : undefined,
                feed,
              )
            }
          />
        )}
        {mode === "list" && (
          <>
            {!header && (
              <>
                <Text accessibilityRole="header" style={s.heading}>
                  {tr("My discussions")}
                </Text>
                <Body>{tr("Bible discussions you created or joined.")}</Body>
              </>
            )}
            {!feed && !demo && !automatic && (
              <Body small>
                {tr(
                  "New submissions stay private while moderation is being prepared.",
                )}
              </Body>
            )}
            {!feed && (
              <>
                <TextAction
                  icon="add"
                  title={tr("Create a discussion")}
                  onPress={startTopic}
                />
                <View
                  style={{
                    flexDirection: "row",
                    gap: 24,
                    borderBottomWidth: 1,
                    borderColor: colors.line,
                  }}
                >
                  {(
                    [
                      ["engaged", tr("Discussions I joined")],
                      ["mine", tr("My submissions")],
                      ...(verse ? [["verse", verse.reference]] : []),
                    ] as ["engaged" | "mine" | "verse", string][]
                  ).map(([value, label]) => (
                    <Pressable
                      key={value}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: filter === value }}
                      onPress={() => setFilter(value)}
                      style={{
                        minHeight: 44,
                        justifyContent: "center",
                        borderBottomWidth: filter === value ? 2 : 0,
                        borderColor: colors.ink,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: filter === value ? colors.ink : colors.muted,
                          fontWeight: filter === value ? "600" : "400",
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            {filter === "mine" ? (
              <>
                <Body small>
                  {tr(
                    "Posts that pass safety checks are published automatically. Anything uncertain stays private.",
                  )}
                </Body>
                {!mine.length && (
                  <Card>
                    <Body>{tr("You have not shared anything yet.")}</Body>
                  </Card>
                )}
                {mine.map((p) => (
                  <Card key={p.id}>
                    <Text style={s.topicTitle}>{postContext(p)}</Text>
                    <Text style={s.tag}>{statusLabel(p)}</Text>
                    <Body>{p.body}</Body>
                    {OwnRemoval(p)}
                    {!demo && automatic && own(p) && p.status === "pending" && (
                      <Button
                        secondary
                        disabled={busy}
                        title={tr("Check publication")}
                        onPress={() => void moderate(p.id)}
                      />
                    )}
                  </Card>
                ))}
              </>
            ) : (
              <>
                {filter === "verse" && (
                  <View style={s.verseContext}>
                    <Ionicons
                      name="book-outline"
                      size={19}
                      color={colors.goldInk}
                    />
                    <Text style={s.small}>
                      {tr("Reflections on")}
                      {verse?.reference}
                      {tr(". Community voices are personal interpretations.")}
                    </Text>
                  </View>
                )}
                {!topics.length && !feed && (
                  <Body small>{tr("No Bible discussions here yet.")}</Body>
                )}
                {!topics.length && feed && !!userId && !busy && !error && (
                  <Body small>{tr("No published discussions yet.")}</Body>
                )}
                {topics.map((t) =>
                  feed ? (
                    <View key={t.id}>
                      {PublicPost({
                        post: t,
                        title: t.title,
                        children: (
                          <>
                            {t.reference && (
                              <Text style={s.tag}>{t.reference}</Text>
                            )}
                            {t.replies
                              .filter((p) => canReadPost(state, p))
                              .slice(-2)
                              .map((p) => (
                                <View
                                  key={p.id}
                                  style={{
                                    borderLeftWidth: 2,
                                    borderColor: colors.line,
                                    paddingLeft: 12,
                                    gap: 4,
                                  }}
                                >
                                  <Text style={s.author}>{p.name}</Text>
                                  <Body>{p.body}</Body>
                                </View>
                              ))}
                            <TextAction
                              icon="chatbubble-outline"
                              title={
                                tr("Comments") +
                                ` (${t.replies.filter((p) => canReadPost(state, p)).length})`
                              }
                              onPress={() => openThread(t.id)}
                            />
                            <TextAction
                              icon="create-outline"
                              title={tr("Add a comment")}
                              onPress={() => openThread(t.id)}
                            />
                          </>
                        ),
                      })}
                    </View>
                  ) : (
                    <Pressable
                      key={t.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${tr("Open")} ${t.title}`}
                      onPress={() => openThread(t.id)}
                      style={({ pressed }) => [
                        s.topicCard,
                        { opacity: pressed ? 0.75 : 1 },
                      ]}
                    >
                      <Text style={s.tag}>{t.reference ?? t.perspective}</Text>
                      <Text style={s.topicTitle}>{t.title}</Text>
                      <Text numberOfLines={2} style={s.excerpt}>
                        {t.body}
                      </Text>
                      <View style={s.topicFooter}>
                        <Text style={s.small}>
                          {t.name} ·{" "}
                          {own(t)
                            ? demo
                              ? tr("Your preview post")
                              : tr("Your post")
                            : demo
                              ? "Example"
                              : tr("Community member")}
                        </Text>
                        <View style={s.count}>
                          <Ionicons
                            name="chatbubble-outline"
                            size={15}
                            color={colors.muted}
                          />
                          <Text style={s.small}>
                            {
                              t.replies.filter((p) => canReadPost(state, p))
                                .length
                            }
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={colors.muted}
                          />
                        </View>
                      </View>
                    </Pressable>
                  ),
                )}
              </>
            )}
            {feed && hasMore && (
              <Button
                secondary
                disabled={loadingMore || busy}
                title={tr(loadingMore ? "Loading…" : "Load older discussions")}
                onPress={() => void loadMore()}
              />
            )}
            {!feed && (
              <>
                <Disclosure title={tr("A kind space, together")}>
                  <Body>
                    {tr(
                      "Ask honestly. Disagree respectfully. No personal attacks, threats, harassment, scams or private information. These are community reflections, not reviewed study notes.",
                    )}
                  </Body>
                  <Body small>
                    {tr(
                      "Only what you type here can be shared. Your diary and chosen faith stay separate. You choose any perspective label yourself.",
                    )}
                  </Body>
                </Disclosure>
                {demo ? (
                  <Disclosure title={tr("Preview tools")}>
                    <Body small>
                      {tr(
                        "This demo uses local memory and manual review. AI screening, real accounts and public posting are not connected. Changes reset when the app reloads.",
                      )}
                    </Body>
                    <Button
                      secondary
                      title={`${tr("Open")} demo review queue (${pending.length + reports.length})`}
                      onPress={() => {
                        setNotice("");
                        setMode("review");
                      }}
                    />
                  </Disclosure>
                ) : null}
              </>
            )}
          </>
        )}
        {mode === "thread" && (
          <>
            {!readable ? (
              <Card>
                <Body>
                  {tr("This conversation is hidden or no longer available.")}
                </Body>
                <Button
                  secondary
                  title={tr("Back to conversations")}
                  onPress={goList}
                />
              </Card>
            ) : (
              <>
                {topic.verseId && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: "/verse/[id]",
                        params: { id: topic.verseId! },
                      })
                    }
                    style={s.verseContext}
                  >
                    <Ionicons
                      name="book-outline"
                      size={19}
                      color={colors.goldInk}
                    />
                    <Text style={s.link}>
                      {tr("Read")}
                      {topic.reference}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={colors.muted}
                    />
                  </Pressable>
                )}
                {PublicPost({ post: topic, opening: true })}
                <Text style={s.sectionLabel}>{tr("THE CONVERSATION")}</Text>
                {topic.replies
                  .filter((p) => canReadPost(state, p))
                  .map((p) => (
                    <View key={p.id}>{PublicPost({ post: p })}</View>
                  ))}
                {!topic.replies.some((p) => canReadPost(state, p)) && (
                  <Body small>
                    {tr("No published replies yet. There is room for yours.")}
                  </Body>
                )}
                {topic.replies
                  .filter((p) => own(p) && p.status === "pending")
                  .map((p) => (
                    <Card key={p.id}>
                      <Text style={s.tag}>
                        {tr("Awaiting a safety check or held · not public")}
                      </Text>
                      <Body>{p.body}</Body>
                      {OwnRemoval(p)}
                      {!demo &&
                        automatic &&
                        own(p) &&
                        p.status === "pending" && (
                          <Button
                            secondary
                            disabled={busy}
                            title={tr("Check publication")}
                            onPress={() => void moderate(p.id)}
                          />
                        )}
                    </Card>
                  ))}
                <View style={s.composer}>
                  <Field
                    label={tr("Your reply")}
                    placeholder={tr("Share a thought or ask a question…")}
                    multiline
                    maxLength={2000}
                    value={reply}
                    onChangeText={setReply}
                  />
                  {!demo && (
                    <Field
                      label={tr("Public display name")}
                      placeholder={tr("Choose a name for this post")}
                      value={alias}
                      onChangeText={setAlias}
                      maxLength={40}
                      autoCapitalize="words"
                    />
                  )}
                  <Body small>
                    {demo
                      ? tr(
                          "Posted as You in this demo. Replies are held for review.",
                        )
                      : automatic
                        ? tr(
                            "Your display name and reply become public if they pass automated moderation.",
                          )
                        : tr(
                            "Automatic moderation is not active. This reply stays private.",
                          )}
                  </Body>
                  <Button
                    title={
                      busy
                        ? tr("Checking...")
                        : demo
                          ? tr("Send for review")
                          : automatic
                            ? tr("Share")
                            : tr("Save for review")
                    }
                    disabled={!reply.trim() || !canPost}
                    onPress={() =>
                      void act(
                        {
                          type: "reply",
                          topicId: topic.id,
                          body: reply,
                          perspective: "Open discussion",
                        },
                        () => {
                          setReply("");
                          setNotice(
                            automatic
                              ? tr(
                                  "Your reply was submitted. Posts that pass the safety check appear automatically; others remain private.",
                                )
                              : tr(
                                  "Your reply was saved privately while moderation is prepared.",
                                ),
                          );
                        },
                      )
                    }
                  />
                </View>
              </>
            )}
          </>
        )}
        {mode === "compose" && (
          <>
            <Text accessibilityRole="header" style={s.heading}>
              {tr("Create a discussion")}
            </Text>
            <Body>
              {tr("Explore a Bible passage, theme, or question together.")}
            </Body>
            {verse && filter === "verse" && (
              <View style={s.verseContext}>
                <Ionicons
                  name="book-outline"
                  size={20}
                  color={colors.goldInk}
                />
                <Text style={s.link}>{verse.reference}</Text>
              </View>
            )}
            <Field
              label={tr("Topic")}
              placeholder={tr(
                "Which Bible passage or theme would you like to discuss?",
              )}
              maxLength={100}
              value={title}
              onChangeText={setTitle}
            />
            <Field
              label={tr("Your question or reflection")}
              placeholder={tr(
                "Share your question or reflection about the Bible.",
              )}
              multiline
              maxLength={2000}
              value={body}
              onChangeText={setBody}
            />
            <Disclosure title={`${tr("Perspective")}: ${tr(perspective)}`}>
              <Body small>
                {tr(
                  "Optional. This label describes the conversation, not your profile.",
                )}
              </Body>
              <Row>
                {perspectives.map((p) => (
                  <Chip
                    key={p}
                    title={tr(p)}
                    selected={perspective === p}
                    onPress={() => setPerspective(p)}
                  />
                ))}
              </Row>
            </Disclosure>
            {!demo && (
              <Field
                label={tr("Public display name")}
                placeholder={tr("Choose a name for this post")}
                value={alias}
                onChangeText={setAlias}
                maxLength={40}
                autoCapitalize="words"
              />
            )}
            <Body small>
              {demo
                ? tr(
                    "Shared as You. Your diary is never attached. This preview holds every submission for manual review.",
                  )
                : automatic
                  ? tr(
                      "Your public name and words are checked automatically using Alibaba Cloud Qwen. Posts that pass appear to members; uncertain posts stay private. AI can make mistakes. Your diary and profile are never attached.",
                    )
                  : tr(
                      "Automatic moderation is not active. This submission stays private. Your diary and profile are never attached.",
                    )}
            </Body>
            <Button
              secondary
              title={tr("Preview discussion")}
              disabled={!title.trim() || !body.trim() || !canPost}
              onPress={() => setPreviewKey(currentPreviewKey)}
            />
            {previewKey === currentPreviewKey && (
              <Card>
                <Body>{demo ? tr("You") : alias.trim()}</Body>
                <Body small>{tr(perspective)}</Body>
                {verse && filter === "verse" && (
                  <>
                    <Body small>{verse.reference}</Body>
                    <Body>{verse.text}</Body>
                  </>
                )}
                <Body>{title.trim()}</Body>
                <Body>{body.trim()}</Body>
                <Body small>
                  {tr(
                    "Members can read and share an approved discussion. Your journal is not attached. Publication may require moderation.",
                  )}
                </Body>
              </Card>
            )}
            <Button
              title={
                busy
                  ? tr("Checking...")
                  : demo
                    ? tr("Send for review")
                    : automatic
                      ? tr("Share")
                      : tr("Save for review")
              }
              disabled={
                !title.trim() ||
                !body.trim() ||
                !canPost ||
                previewKey !== currentPreviewKey
              }
              onPress={() =>
                void act(
                  {
                    type: "topic",
                    title,
                    body,
                    perspective,
                    verseId: filter === "verse" ? verse?.id : undefined,
                    reference:
                      filter === "verse" ? verse?.reference : undefined,
                  },
                  () => {
                    setMode("list");
                    setFilter(feed ? "all" : "mine");
                    clearStudyDiscussionTopic();
                    setNotice(
                      tr(
                        "Your topic was submitted. Check My submissions for its publication status.",
                      ),
                    );
                  },
                )
              }
            />
          </>
        )}
        {mode === "review" && moderator && (
          <>
            <Text accessibilityRole="header" style={s.heading}>
              {demo ? tr("Demo review") : tr("Moderation")}
            </Text>
            <Notice
              text={
                demo
                  ? tr(
                      "Preview tools only. You are trying a manual moderator workflow. No AI is connected, and these decisions affect only your local demo.",
                    )
                  : tr(
                      "Review the words in context. Automated moderation can make mistakes. These controls override publication only for authorized staff.",
                    )
              }
            />
            <Text style={s.sectionLabel}>
              {tr("AWAITING REVIEW ·")}
              {pending.length}
            </Text>
            {!pending.length && (
              <Body small>{tr("No submissions waiting.")}</Body>
            )}
            {pending.map((p) => (
              <Card key={p.id}>
                <Text style={s.topicTitle}>{postContext(p)}</Text>
                <Text style={s.author}>
                  {p.name} · {p.perspective}
                </Text>
                <Body>{p.body}</Body>
                {!demo && (
                  <>
                    {p.screening && (
                      <View style={{ gap: 8 }}>
                        <Text style={s.tag}>{tr("AI notes · advisory")}</Text>
                        <Body small>
                          {p.screening.flags.join(", ") ||
                            tr("No flags returned")}
                        </Body>
                        <Body>{p.screening.summary}</Body>
                      </View>
                    )}
                    <Button
                      secondary
                      disabled={busy}
                      title={tr("Check with AI")}
                      onPress={() => void screen(p.id).then(setNotice)}
                    />
                  </>
                )}
                <Button
                  disabled={busy}
                  title={demo ? tr("Approve in preview") : tr("Approve")}
                  onPress={() =>
                    void act({ type: "review", postId: p.id, approve: true })
                  }
                />
                <Button
                  secondary
                  disabled={busy}
                  title={tr("Do not publish")}
                  onPress={() =>
                    void act({ type: "review", postId: p.id, approve: false })
                  }
                />
              </Card>
            ))}
            <Text style={s.sectionLabel}>
              {tr("REPORTED CONTENT ·")}
              {reports.length}
            </Text>
            {!reports.length && <Body small>{tr("No reports waiting.")}</Body>}
            {reports.map((r) => (
              <Card key={r.id}>
                <Text style={s.tag}>
                  {tr("Reason:")}
                  {r.reason}
                </Text>
                <Body>{allPosts.find((p) => p.id === r.postId)?.body}</Body>
                <Button
                  disabled={busy}
                  title={demo ? tr("Remove in preview") : tr("Remove post")}
                  onPress={() =>
                    void act({ type: "resolve", reportId: r.id, remove: true })
                  }
                />
                <Button
                  secondary
                  disabled={busy}
                  title={tr("Keep post and resolve report")}
                  onPress={() =>
                    void act({ type: "resolve", reportId: r.id, remove: false })
                  }
                />
              </Card>
            ))}
          </>
        )}
        {state.blocked.length > 0 && (
          <Disclosure
            title={`${tr("Blocked people")} (${state.blocked.length})`}
          >
            {state.blocked.map((a) => (
              <Button
                key={a}
                secondary
                title={`${tr("Unblock")} ${allPosts.find((p) => p.author === a)?.name ?? a}`}
                onPress={() => void act({ type: "unblock", author: a })}
              />
            ))}
          </Disclosure>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  back: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 3 },
  backText: { fontSize: 15, color: colors.ink },
  brand: {
    flex: 1,
    fontSize: 10,
    letterSpacing: 1.7,
    textAlign: "right",
    color: colors.muted,
  },
  page: {
    padding: 22,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 18,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
  },
  heading: {
    fontFamily: serif,
    fontSize: 37,
    lineHeight: 43,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  small: { fontSize: 12, lineHeight: 19, color: colors.muted, flexShrink: 1 },
  sectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.7,
    color: colors.muted,
  },
  newTopic: {
    minHeight: 44,
    paddingHorizontal: 15,
    borderRadius: 24,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  newTopicText: { fontSize: 13, fontWeight: "600", color: colors.white },
  topicCard: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 23,
    padding: 21,
    gap: 11,
  },
  tag: {
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
    color: colors.goldInk,
  },
  topicTitle: {
    fontFamily: serif,
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
  },
  excerpt: { fontSize: 15, lineHeight: 24, color: colors.muted },
  topicFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 8,
  },
  count: { flexDirection: "row", alignItems: "center", gap: 7 },
  verseContext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 15,
    borderRadius: 17,
    backgroundColor: colors.pale,
    minHeight: 50,
  },
  link: { fontSize: 14, color: colors.goldInk, flexShrink: 1 },
  authorLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: colors.pale,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontFamily: serif, fontSize: 18, color: colors.goldInk },
  author: { fontSize: 14, fontWeight: "600", color: colors.ink },
  options: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPanel: {
    gap: 10,
    padding: 14,
    backgroundColor: colors.paper,
    borderRadius: 14,
  },
  label: { fontSize: 14, color: colors.ink, fontWeight: "600" },
  threadTitle: {
    fontFamily: serif,
    fontSize: 27,
    lineHeight: 34,
    color: colors.ink,
  },
  composer: { gap: 12, paddingTop: 8 },
});
