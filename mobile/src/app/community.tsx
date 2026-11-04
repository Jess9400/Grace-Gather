import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
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
import privateRules from "../generated/community-private-rules.json";
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
export default function Community() {
  const { userId } = useCommunity();
  return <CommunityScreen key={userId ?? "signed-out"} />;
}
function CommunityScreen() {
  const params = useLocalSearchParams<{ verse?: string }>();
  const linkedVerse = params.verse ? discussionVerseId(params.verse) : null;
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
    limits,
    reload,
    perform,
    screen,
    moderate,
  } = useCommunity();
  const [alias, setAlias] = useState("Member");
  const [mode, setMode] = useState<ViewMode>("list"),
    [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "verse" | "mine">(
    verse ? "verse" : "all",
  );
  const [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [reply, setReply] = useState("");
  const [perspective, setPerspective] =
    useState<Perspective>("Open discussion");
  const [notice, setNotice] = useState(""),
    [actionsFor, setActionsFor] = useState<string | null>(null),
    [reportReason, setReportReason] = useState("");
  useEffect(() => {
    void reload(selected ?? undefined);
  }, [reload, selected, userId]);
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
      ? "Awaiting a safety check or held"
      : p.status === "removed"
        ? "Not published"
        : demo
          ? "Published in this preview"
          : "Published";
  const postContext = (p: Post) =>
    state.topics.find((t) => t.id === p.id)?.title ??
    `Reply to ${state.topics.find((t) => t.replies.some((r) => r.id === p.id))?.title ?? "a conversation"}`;
  function OwnRemoval(post: Post) {
    if (!own(post)) return null;
    return removing === post.id ? (
      <View style={{ gap: 10 }}>
        <Body small>
          Remove this post? Removing a topic also removes its replies.
        </Body>
        <Button
          secondary
          disabled={busy}
          title="Confirm removal"
          onPress={() =>
            void act({ type: "delete", postId: post.id }, () => {
              setRemoving(null);
              setNotice("Your post was removed.");
            })
          }
        />
        <Button secondary title="Keep post" onPress={() => setRemoving(null)} />
      </View>
    ) : (
      <Button
        secondary
        disabled={busy}
        title="Remove your post"
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
            <Text style={s.label}>Report this post</Text>
            <Field
              label="Reason for report"
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="Tell us what concerns you"
              maxLength={300}
            />
            <Button
              title="Send report"
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
                      "Report sent for review. This post is hidden for you.",
                    );
                  },
                )
              }
            />
            <Button
              secondary
              title={`Block ${post.name}`}
              disabled={busy}
              onPress={() =>
                void act({ type: "block", author: post.author }, () => {
                  setActionsFor(null);
                  setNotice(
                    `${post.name}'s posts and replies are hidden for you. You can undo this below.`,
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
  }: {
    post: Post;
    opening?: boolean;
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
                  ? "Local preview submission"
                  : "Your post"
                : demo
                  ? "Example conversation"
                  : "Community member"}
            </Text>
          </View>
          {!own(post) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Options for ${post.name}'s post`}
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
          <Text style={s.tag}>{post.perspective}</Text>
        )}
        {opening && topic && (
          <Text accessibilityRole="header" style={s.threadTitle}>
            {topic.title}
          </Text>
        )}
        <Body>{post.body}</Body>
        {OwnRemoval(post)}
        {actionsFor === post.id && PostActions({ post })}
      </Card>
    );
  }
  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom", "left", "right"]}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
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
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.brand}>GRACE & GATHER</Text>
        <Ionicons name="leaf-outline" size={21} color={colors.gold} />
      </View>
      <ScrollView
        key={`${mode}-${selected ?? ""}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.page}
      >
        <View style={s.preview}>
          <Ionicons
            name={demo ? "flask-outline" : "people-outline"}
            size={15}
            color={colors.goldInk}
          />
          <Text style={s.small}>
            {demo
              ? "Community preview · sample conversations · nothing is public"
              : "Community · questions and reflections"}
          </Text>
        </View>
        <Notice text={error || notice} />
        {!demo && (!connected || !userId) && (
          <Card>
            <Body>
              {connected
                ? "Sign in to join the conversation."
                : "Community is not connected on this build yet."}
            </Body>
            <Body small>
              Your private diary stays separate. Only the words you choose to
              post are shared.
            </Body>
            <Button
              secondary
              title="Account and sign in"
              onPress={() => router.push("/account")}
            />
          </Card>
        )}
        {!demo && userId && (
          <Button
            secondary
            disabled={busy}
            title="Refresh conversations"
            onPress={() => void reload(selected ?? undefined)}
          />
        )}
        {mode === "list" && (
          <>
            <Text accessibilityRole="header" style={s.heading}>
              A little space{String.fromCharCode(10)}to listen.
            </Text>
            <Body>Questions, reflections and faith, shared gently.</Body>
            {!demo && !automatic && (
              <Body small>
                New submissions stay private while moderation is being prepared.
              </Body>
            )}
            <View style={s.sectionBar}>
              <Text style={s.sectionLabel}>COMMUNITY</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  userId ? startTopic() : router.push("/account")
                }
                style={s.newTopic}
              >
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={s.newTopicText}>New topic</Text>
              </Pressable>
            </View>
            <Row>
              <Chip
                title="Conversations"
                selected={filter === "all"}
                onPress={() => setFilter("all")}
              />
              {verse && (
                <Chip
                  title={verse.reference}
                  selected={filter === "verse"}
                  onPress={() => setFilter("verse")}
                />
              )}
              <Chip
                title={`My submissions${mine.length ? ` (${mine.length})` : ""}`}
                selected={filter === "mine"}
                onPress={() => setFilter("mine")}
              />
            </Row>
            {filter === "mine" ? (
              <>
                <Body small>
                  Posts that pass safety checks are published automatically.
                  Anything uncertain stays private.
                </Body>
                {!mine.length && (
                  <Card>
                    <Body>You have not shared anything yet.</Body>
                    <Button
                      secondary
                      title="Start a topic"
                      onPress={startTopic}
                    />
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
                        title="Check publication"
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
                      Reflections on {verse?.reference}. Community voices are
                      personal interpretations.
                    </Text>
                  </View>
                )}
                {!topics.length && (
                  <Card>
                    <Text style={s.topicTitle}>
                      There is room for your question.
                    </Text>
                    <Body>
                      {verse && filter === "verse"
                        ? "Be the first to start a conversation about this verse."
                        : "Start with a question or a reflection."}
                    </Body>
                    <Button title="Start a conversation" onPress={startTopic} />
                  </Card>
                )}
                {topics.map((t) => (
                  <Pressable
                    key={t.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${t.title}`}
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
                            ? "Your preview post"
                            : "Your post"
                          : demo
                            ? "Example"
                            : "Community member"}
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
                ))}
              </>
            )}
            <Disclosure title="A kind space, together">
              <Body>
                Ask honestly. Disagree respectfully. No personal attacks,
                threats, harassment, scams or private information. These are
                community reflections, not reviewed study notes.
              </Body>
              <Body small>
                Only what you type here can be shared. Your diary and chosen
                faith stay separate. You choose any perspective label yourself.
              </Body>
            </Disclosure>
            {demo ? (
              <Disclosure title="Preview tools">
                <Body small>
                  This demo uses local memory and manual review. AI screening,
                  real accounts and public posting are not connected. Changes
                  reset when the app reloads.
                </Body>
                <Button
                  secondary
                  title={`Open demo review queue (${pending.length + reports.length})`}
                  onPress={() => {
                    setNotice("");
                    setMode("review");
                  }}
                />
              </Disclosure>
            ) : (
              moderator && (
                <Button
                  secondary
                  title={`Moderation queue (${pending.length + reports.length})`}
                  onPress={() => setMode("review")}
                />
              )
            )}
            {!demo && limits && (
              <Body small>
                Showing recent conversations and up to {limits.repliesPerTopic}{" "}
                replies per conversation. Refresh for updates.
              </Body>
            )}
          </>
        )}
        {mode === "thread" && (
          <>
            {!readable ? (
              <Card>
                <Body>This conversation is hidden or no longer available.</Body>
                <Button
                  secondary
                  title="Back to conversations"
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
                    <Text style={s.link}>Read {topic.reference}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={colors.muted}
                    />
                  </Pressable>
                )}
                {PublicPost({ post: topic, opening: true })}
                <Text style={s.sectionLabel}>THE CONVERSATION</Text>
                {topic.replies
                  .filter((p) => canReadPost(state, p))
                  .map((p) => (
                    <View key={p.id}>{PublicPost({ post: p })}</View>
                  ))}
                {!topic.replies.some((p) => canReadPost(state, p)) && (
                  <Body small>
                    No published replies yet. There is room for yours.
                  </Body>
                )}
                {topic.replies
                  .filter((p) => own(p) && p.status === "pending")
                  .map((p) => (
                    <Card key={p.id}>
                      <Text style={s.tag}>
                        Awaiting a safety check or held · not public
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
                            title="Check publication"
                            onPress={() => void moderate(p.id)}
                          />
                        )}
                    </Card>
                  ))}
                <View style={s.composer}>
                  {!demo && automatic && (
                    <Button
                      secondary
                      title="Thank you for sharing."
                      onPress={() => {
                        setReply("Thank you for sharing.");
                        setAlias("Member");
                      }}
                    />
                  )}
                  <Field
                    label="Your reply"
                    placeholder="Share a thought or ask a question…"
                    multiline
                    maxLength={2000}
                    value={reply}
                    onChangeText={setReply}
                  />
                  {!demo && (
                    <Field
                      label="Public display name"
                      placeholder="Choose a name for this post"
                      value={alias}
                      onChangeText={setAlias}
                      maxLength={40}
                      autoCapitalize="words"
                    />
                  )}
                  <Body small>
                    {demo
                      ? "Posted as You in this demo. Replies are held for review."
                      : automatic
                        ? "Private rules can publish simple matching replies. Other replies stay private. No external AI provider receives them."
                        : "Automatic moderation is not active. This reply stays private."}
                  </Body>
                  <Button
                    title={
                      busy
                        ? "Checking..."
                        : demo
                          ? "Send for review"
                          : automatic
                            ? "Share"
                            : "Save for review"
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
                              ? "Your reply was checked by private rules. See its publication status below."
                              : "Your reply was saved privately while moderation is prepared.",
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
              What is on{String.fromCharCode(10)}your heart?
            </Text>
            <Body>A question is a good place to begin.</Body>
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
            {!demo && automatic && (
              <Disclosure title="Start with a simple reflection">
                <Body small>
                  These short starters can publish automatically with the public
                  name Member. You can edit freely, but other wording or names
                  will be held privately.
                </Body>
                {privateRules.presets.map((p) => (
                  <Button
                    key={p.title}
                    secondary
                    title={p.title}
                    onPress={() => {
                      setTitle(p.title);
                      setBody(p.body);
                      setAlias("Member");
                    }}
                  />
                ))}
              </Disclosure>
            )}
            <Field
              label="Topic"
              placeholder="Give your conversation a title"
              maxLength={100}
              value={title}
              onChangeText={setTitle}
            />
            <Field
              label="Your words"
              placeholder="Share only what you feel comfortable making public."
              multiline
              maxLength={2000}
              value={body}
              onChangeText={setBody}
            />
            <Disclosure title={`Perspective: ${perspective}`}>
              <Body small>
                Optional. This label describes the conversation, not your
                profile.
              </Body>
              <Row>
                {perspectives.map((p) => (
                  <Chip
                    key={p}
                    title={p}
                    selected={perspective === p}
                    onPress={() => setPerspective(p)}
                  />
                ))}
              </Row>
            </Disclosure>
            {!demo && (
              <Field
                label="Public display name"
                placeholder="Choose a name for this post"
                value={alias}
                onChangeText={setAlias}
                maxLength={40}
                autoCapitalize="words"
              />
            )}
            <Body small>
              {demo
                ? "Shared as You. Your diary is never attached. This preview holds every submission for manual review."
                : automatic
                  ? "Private rules check your chosen public name and words inside our app backend. Simple matching messages can publish; other posts stay private. No AI provider receives them. Your diary and profile are never attached."
                  : "Automatic moderation is not active. This submission stays private. Your diary and profile are never attached."}
            </Body>
            <Button
              title={
                busy
                  ? "Checking..."
                  : demo
                    ? "Send for review"
                    : automatic
                      ? "Share"
                      : "Save for review"
              }
              disabled={!title.trim() || !body.trim() || !canPost}
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
                    setFilter("mine");
                    setNotice(
                      "Your topic was submitted. Check My submissions for its publication status.",
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
              {demo ? "Demo review" : "Moderation"}
            </Text>
            <Notice
              text={
                demo
                  ? "Preview tools only. You are trying a manual moderator workflow. No AI is connected, and these decisions affect only your local demo."
                  : "Review the words in context. Private rules have limited coverage. These controls override publication only for authorized staff."
              }
            />
            <Text style={s.sectionLabel}>
              AWAITING REVIEW · {pending.length}
            </Text>
            {!pending.length && <Body small>No submissions waiting.</Body>}
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
                        <Text style={s.tag}>Private rule notes</Text>
                        <Body small>
                          {p.screening.flags.join(", ") || "No flags returned"}
                        </Body>
                        <Body>{p.screening.summary}</Body>
                      </View>
                    )}
                    <Button
                      secondary
                      disabled={busy}
                      title="Check private rules"
                      onPress={() => void screen(p.id).then(setNotice)}
                    />
                  </>
                )}
                <Button
                  disabled={busy}
                  title={demo ? "Approve in preview" : "Approve"}
                  onPress={() =>
                    void act({ type: "review", postId: p.id, approve: true })
                  }
                />
                <Button
                  secondary
                  disabled={busy}
                  title="Do not publish"
                  onPress={() =>
                    void act({ type: "review", postId: p.id, approve: false })
                  }
                />
              </Card>
            ))}
            <Text style={s.sectionLabel}>
              REPORTED CONTENT · {reports.length}
            </Text>
            {!reports.length && <Body small>No reports waiting.</Body>}
            {reports.map((r) => (
              <Card key={r.id}>
                <Text style={s.tag}>Reason: {r.reason}</Text>
                <Body>{allPosts.find((p) => p.id === r.postId)?.body}</Body>
                <Button
                  disabled={busy}
                  title={demo ? "Remove in preview" : "Remove post"}
                  onPress={() =>
                    void act({ type: "resolve", reportId: r.id, remove: true })
                  }
                />
                <Button
                  secondary
                  disabled={busy}
                  title="Keep post and resolve report"
                  onPress={() =>
                    void act({ type: "resolve", reportId: r.id, remove: false })
                  }
                />
              </Card>
            ))}
          </>
        )}
        {state.blocked.length > 0 && (
          <Disclosure title={`Blocked people (${state.blocked.length})`}>
            {state.blocked.map((a) => (
              <Button
                key={a}
                secondary
                title={`Unblock ${allPosts.find((p) => p.author === a)?.name ?? a}`}
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
