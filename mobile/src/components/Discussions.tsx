import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  Body,
  Button,
  Chip,
  Field,
  Heading,
  Notice,
  Row,
  Screen,
  colors,
  serif,
} from "./quiet-ui";
import { TextAction } from "./CommunityControls";
import ChatThread from "./ChatThread";
import HelpLine from "./HelpLine";
import { helplineText } from "../lib/help-lines";
import { useApp } from "../lib/state";
import { copy, needsSupport } from "../lib/content";
import { useCommunity } from "../lib/discussion-state";
import {
  canReadPost,
  visibleTopics,
  type Post,
  type Topic,
} from "../lib/discussion-model";
import { friendCopy } from "../lib/friends-copy";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { roomTheme } from "../lib/people-theme";

// Discussions are the app's group conversations: anyone can start one, about a
// Bible verse or anything else, and every message passes a safety check before
// other people see it.

const OPEN = "Open discussion" as const;

// Every discussion as a card in its own colour.
export default function Discussions({
  verse,
  onClearVerse,
  onOpen,
  onStart,
  initialFilter = "all",
}: {
  // Show only discussions about this verse (arriving from the Bible).
  verse?: { id: string; reference: string } | null;
  onClearVerse: () => void;
  onOpen: (topicId: string) => void;
  onStart: () => void;
  initialFilter?: "all" | "mine";
}) {
  const { profile } = useApp(),
    lang = profile.language,
    c = (key: string) => friendCopy(lang, key),
    tr = useInterfaceCopy();
  const { state, userId, error, reload, loadMore, hasMore, loadingMore } =
    useCommunity();
  const [filter, setFilter] = useState<"all" | "mine">(initialFilter);
  // Opens with the newest discussions and keeps itself fresh; nothing to press.
  useFocusEffect(
    useCallback(() => {
      void reload(undefined, filter === "all");
      const timer = setInterval(
        () => void reload(undefined, filter === "all"),
        30000,
      );
      return () => clearInterval(timer);
    }, [reload, filter]),
  );
  const own = (post: Post) => post.author === userId;
  const topics = visibleTopics(state, verse?.id).filter(
    (topic) => filter === "all" || own(topic) || topic.replies.some(own),
  );
  // Your own discussions still waiting for the check, visible only to you.
  const waiting = state.topics.filter(
    (topic) => own(topic) && topic.status === "pending",
  );
  return (
    <>
      <Text style={s.intro}>
        {c(
          "Talk together about a verse or anything on your heart. Every message passes a safety check before others see it.",
        )}
      </Text>
      <Button title={c("Start a discussion")} onPress={onStart} />
      <Row>
        <Chip
          title={c("All")}
          selected={filter === "all"}
          onPress={() => setFilter("all")}
        />
        <Chip
          title={c("Mine")}
          selected={filter === "mine"}
          onPress={() => setFilter("mine")}
        />
        {verse && (
          <Chip
            title={`${verse.reference} ×`}
            selected
            onPress={onClearVerse}
          />
        )}
      </Row>
      <Notice text={error ? tr(error) : ""} />
      {waiting.map((topic) => (
        <DiscussionCard
          key={topic.id}
          topic={topic}
          tag={c("Being checked")}
          onPress={() => onOpen(topic.id)}
        />
      ))}
      {topics.map((topic) => {
        const replies = topic.replies.filter((r) =>
          canReadPost(state, r),
        ).length;
        return (
          <DiscussionCard
            key={topic.id}
            topic={topic}
            tag={topic.reference || c("Discussion")}
            detail={replies === 1 ? c("1 reply") : `${replies} ${c("replies")}`}
            onPress={() => onOpen(topic.id)}
          />
        );
      })}
      {!topics.length && !waiting.length && !error && (
        <Body>
          {c(
            filter === "mine"
              ? "You have not joined a discussion yet."
              : "No discussions yet. Start the first one.",
          )}
        </Body>
      )}
      {filter === "all" && hasMore && (
        <View style={{ alignSelf: "center" }}>
          <TextAction
            title={c("More discussions")}
            disabled={loadingMore}
            onPress={() => void loadMore()}
          />
        </View>
      )}
    </>
  );
}

function DiscussionCard({
  topic,
  tag,
  detail,
  onPress,
}: {
  topic: Topic;
  tag: string;
  detail?: string;
  onPress: () => void;
}) {
  const { profile } = useApp();
  const theme = roomTheme(topic.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${topic.title}. ${topic.body}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={s.cardTop}>
        <View style={s.tag}>
          <View style={[s.dot, { backgroundColor: theme.dot }]} />
          <Text numberOfLines={1} style={s.tagText}>
            {tag}
          </Text>
        </View>
        {!!detail && <Text style={s.detail}>{detail}</Text>}
      </View>
      <Text style={s.title}>{topic.title}</Text>
      <Text numberOfLines={2} style={s.preview}>
        {topic.body}
      </Text>
      <Text style={s.by}>
        {friendCopy(profile.language, "Started by")} {topic.name}
      </Text>
    </Pressable>
  );
}

// Asked once: the public name shown beside what you write.
function NamePrompt({
  busy,
  onSave,
}: {
  busy: boolean;
  onSave: (name: string) => void;
}) {
  const { profile } = useApp(),
    c = (key: string) => friendCopy(profile.language, key);
  const [name, setName] = useState("");
  return (
    <View style={{ gap: 8 }}>
      <Body small>
        {c(
          "Choose a public name to write here. Only this name is shown with your messages.",
        )}
      </Body>
      <Field
        label={c("Your public name")}
        value={name}
        onChangeText={setName}
        maxLength={40}
      />
      <Button
        title={c("Save")}
        disabled={busy || name.trim().length < 2}
        onPress={() => onSave(name.trim())}
      />
    </View>
  );
}

// One discussion, full screen: the opening words first, then the replies.
export function DiscussionRoom({
  topicId,
  myName,
  onSaveName,
  onBack,
}: {
  topicId: string;
  myName: string;
  onSaveName: (name: string) => Promise<boolean>;
  onBack: () => void;
}) {
  const { profile } = useApp(),
    lang = profile.language,
    c = (key: string) => friendCopy(lang, key),
    tr = useInterfaceCopy();
  const { state, userId, busy, error, reload, perform, moderate } =
    useCommunity();
  const [notice, setNotice] = useState(""),
    [support, setSupport] = useState(false),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    void reload(topicId, false).then(() => {
      if (alive) setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [reload, topicId, userId]);
  // New replies, and the result of the safety check, arrive on their own.
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => void reload(topicId, false), 8000);
      return () => clearInterval(timer);
    }, [reload, topicId]),
  );
  const topic = state.topics.find((t) => t.id === topicId);
  const own = (post: Post) => post.author === userId;
  const posts = topic
    ? [topic as Post, ...topic.replies].filter(
        (post) => own(post) || canReadPost(state, post),
      )
    : [];
  const byId = new Map(posts.map((post) => [post.id, post]));
  const theme = roomTheme(topicId);
  return (
    <ChatThread
      title={topic?.title ?? c("Discussion")}
      subtitle={
        topic ? (topic.reference ?? `${c("Started by")} ${topic.name}`) : ""
      }
      tint={theme.tint}
      rule={c(
        "Be kind. Every message passes a safety check before others see it, and moderators look at anything uncertain. Everyone in the community can read this, so please do not share private details.",
      )}
      backLabel={c("Back")}
      onBack={onBack}
      menuLabel={c("More")}
      messages={posts.map((post) => ({
        id: post.id,
        body: post.body,
        name: post.name,
        mine: own(post),
        note:
          post.status === "pending"
            ? c("Being checked. Only you can see this for now.")
            : post.status === "removed"
              ? c("Not published.")
              : undefined,
      }))}
      myName={myName || undefined}
      locale={lang}
      empty={
        loaded && !topic ? c("This discussion is no longer available.") : ""
      }
      olderLabel=""
      actionsHint={c("Report or block")}
      renderActions={(message, close) => (
        <OthersActions
          busy={busy}
          c={c}
          onCancel={close}
          onReport={(reason) =>
            void perform({ type: "report", postId: message.id, reason }).then(
              (ok) => {
                if (!ok) return;
                close();
                setNotice("Report sent");
              },
            )
          }
          onBlock={() => {
            const author = byId.get(message.id)?.author;
            if (!author) return;
            void perform({ type: "block", author }).then((ok) => {
              if (!ok) return;
              close();
              setNotice("Member blocked");
            });
          }}
        />
      )}
      renderOwnActions={(message, close) => {
        const post = byId.get(message.id);
        // Deleting the opening words would delete the whole discussion; that
        // stays a deliberate step for moderators.
        const isOpening = message.id === topicId;
        return (
          <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
            {post?.status === "pending" && (
              <TextAction
                title={c("Check again")}
                disabled={busy}
                onPress={() => {
                  close();
                  void moderate(message.id);
                }}
              />
            )}
            {!isOpening && (
              <TextAction
                title={c("Delete my message")}
                disabled={busy}
                onPress={() => {
                  close();
                  void perform({ type: "delete", postId: message.id });
                }}
              />
            )}
            <TextAction title={c("Cancel")} onPress={close} />
          </View>
        );
      }}
      notice={error ? tr(error) : notice ? c(notice) : ""}
      // Someone writing about harming themselves sees where to find help.
      extraNotice={
        support
          ? `${copy(lang, "supportDesc")} ${helplineText(profile)}`
          : undefined
      }
      placeholder={c("Write something kind…")}
      sendLabel={c("Send")}
      maxLength={2000}
      busy={busy}
      onSend={async (text) => {
        setNotice("");
        const ok = await perform(
          { type: "reply", topicId, body: text, perspective: OPEN },
          myName,
        );
        if (ok) setSupport(needsSupport(text));
        return ok;
      }}
      composer={
        !topic ? (
          <View />
        ) : myName ? undefined : (
          <NamePrompt busy={busy} onSave={(name) => void onSaveName(name)} />
        )
      }
    />
  );
}

// What you can do about someone else's message.
function OthersActions({
  busy,
  c,
  onReport,
  onBlock,
  onCancel,
}: {
  busy: boolean;
  c: (key: string) => string;
  onReport: (reason: string) => void;
  onBlock: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"report" | "block" | null>(null),
    [reason, setReason] = useState("");
  if (mode === "report")
    return (
      <>
        <Field
          label={c("Reason for report")}
          value={reason}
          onChangeText={setReason}
          maxLength={500}
        />
        <Button
          title={c("Report")}
          disabled={busy || reason.trim().length < 3}
          onPress={() => onReport(reason)}
        />
        <TextAction title={c("Cancel")} onPress={onCancel} />
      </>
    );
  if (mode === "block")
    return (
      <>
        <Body>
          {c("Block this member?")}{" "}
          {c("You will stop seeing what this member writes in discussions.")}
        </Body>
        <Button title={c("Block")} disabled={busy} onPress={onBlock} />
        <TextAction title={c("Cancel")} onPress={onCancel} />
      </>
    );
  return (
    <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
      <TextAction title={c("Report")} onPress={() => setMode("report")} />
      <TextAction title={c("Block")} onPress={() => setMode("block")} />
    </View>
  );
}

// Starting a discussion: a title and your first words.
export function StartDiscussion({
  myName,
  onSaveName,
  initialTitle,
  verse,
  onDone,
  onBack,
}: {
  myName: string;
  onSaveName: (name: string) => Promise<boolean>;
  initialTitle: string;
  verse?: { id: string; reference: string } | null;
  // Called with true once the discussion was sent.
  onDone: () => void;
  onBack: () => void;
}) {
  const { profile } = useApp(),
    c = (key: string) => friendCopy(profile.language, key),
    tr = useInterfaceCopy();
  const { busy, error, perform } = useCommunity();
  const [title, setTitle] = useState(initialTitle),
    [body, setBody] = useState("");
  return (
    <Screen>
      <TextAction icon="chevron-back" title={c("Back")} onPress={onBack} />
      <Heading>{c("Start a discussion")}</Heading>
      <Text style={s.intro}>
        {c(
          "Anyone in the community can read and answer. It appears once it passes the safety check.",
        )}
      </Text>
      {verse && (
        <Text style={s.verse}>
          {c("About")} {verse.reference}
        </Text>
      )}
      <Notice text={error ? tr(error) : ""} />
      {myName ? (
        <>
          <Field
            label={c("Title")}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Field
            label={c("What would you like to talk about?")}
            multiline
            value={body}
            onChangeText={setBody}
            maxLength={2000}
          />
          <Button
            title={c("Start a discussion")}
            disabled={busy || !title.trim() || !body.trim()}
            onPress={() =>
              void perform(
                {
                  type: "topic",
                  title,
                  body,
                  perspective: OPEN,
                  verseId: verse?.id,
                  reference: verse?.reference,
                },
                myName,
              ).then((ok) => {
                if (ok) onDone();
              })
            }
          />
          <HelpLine />
        </>
      ) : (
        <NamePrompt busy={busy} onSave={(name) => void onSaveName(name)} />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  intro: { fontSize: 14, lineHeight: 20, color: colors.muted },
  verse: { fontSize: 14, fontWeight: "700", color: colors.goldInk },
  card: {
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 22,
    boxShadow: "0px 8px 20px rgba(48,44,40,0.07)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tag: {
    flexShrink: 1,
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.75)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tagText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  detail: { fontSize: 12, fontWeight: "600", color: "#5F564D" },
  title: { fontFamily: serif, fontSize: 21, lineHeight: 26, color: colors.ink },
  preview: { fontSize: 14, lineHeight: 20, color: "#4A433C" },
  by: { fontSize: 12, color: "#5F564D" },
});
