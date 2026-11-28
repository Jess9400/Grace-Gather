import { collaborationCopy } from "../lib/study-collaboration-copy";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import {
  refreshPrayerBadges,
  useUnreadCounts,
  type UnreadCounts,
} from "../lib/prayers";
import { backend } from "../lib/backend";
import { useApp } from "../lib/state";
import {
  activityDestination,
  groupUnreadActivity,
  type ActivityItem,
} from "../lib/activity-notices";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { freshNotice, type NoticeKind } from "../lib/home-notice";
import { track } from "../lib/analytics";

type Kind = NoticeKind;
const NOTICE: Record<
  Kind,
  { text: string; icon: keyof typeof Ionicons.glyphMap; href: Href }
> = {
  messages: {
    text: "You have a new message",
    icon: "chatbubble-ellipses-outline",
    href: { pathname: "/friends", params: { view: "friends" } },
  },
  prayers: {
    text: "New prayer notification",
    icon: "heart-outline",
    href: "/notifications",
  },
  activity: {
    text: "New reply in a discussion",
    icon: "chatbubbles-outline",
    href: "/notifications",
  },
  gatherings: {
    text: "A gathering is coming up",
    icon: "calendar-outline",
    href: "/notifications",
  },
};
const SHOWN_MS = 6000;
// What has already been announced in this app session, so leaving Home and
// coming back does not repeat it. Only a rise in a count is news.
let announced: Pick<UnreadCounts, Kind> | null = null;

type Opened = {
  text: string;
  href: Href;
  // Marks exactly what the notice points at as read, once the person goes there.
  markRead?: () => Promise<unknown>;
};
// The newest unread item of a kind, with where it lives and how to mark it
// read. Null falls back to the general notice and the Notifications page.
async function newestItem(
  kind: Kind,
  tr: (text: string) => string,
  language: string,
): Promise<Opened | null> {
  if (!backend) return null;
  const db = backend;
  if (kind === "messages") {
    const { data, error } = await db.rpc("friend_unread_list");
    const chats = (error ? [] : (data ?? [])) as {
      link_id: string;
      name: string;
      latest_at: string;
    }[];
    const chat = chats.sort((a, b) =>
      b.latest_at.localeCompare(a.latest_at),
    )[0];
    // Opening the chat marks its messages read.
    return chat
      ? {
          text: tr("New message from {name}").replace("{name}", chat.name),
          href: {
            pathname: "/friends",
            params: { view: "friends", chat: chat.link_id },
          },
        }
      : null;
  }
  if (kind === "activity") {
    const first = await db.rpc("activity_snapshot_v2");
    const { data, error } =
      first.error?.code === "PGRST202"
        ? await db.rpc("activity_snapshot")
        : first;
    const group = error
      ? undefined
      : groupUnreadActivity((data?.items ?? []) as ActivityItem[])[0];
    if (!group) return null;
    return {
      text: group.item.kind.startsWith("study_")
        ? collaborationCopy(language as import("../lib/content").Language)
            .inviteNotice
        : tr(
            group.item.kind === "discussion_reply"
              ? "New reply in a discussion"
              : group.item.kind === "confession_thanks"
                ? "Someone thanked you for offering comfort"
                : "Someone responded to your confession",
          ),
      href: activityDestination(group.item),
      markRead: () =>
        Promise.all(
          group.ids.map((id) => db.rpc("activity_mark_read", { p_id: id })),
        ),
    };
  }
  if (kind === "gatherings") {
    const { data, error } = await db.rpc("gathering_notifications");
    const items = (error ? [] : (data?.items ?? [])) as {
      id: string;
      gathering_id: string;
      title: Record<string, string>;
      is_read: boolean;
    }[];
    const item = items.find((value) => !value.is_read);
    if (!item) return null;
    const title =
      item.title?.[language] ?? Object.values(item.title ?? {})[0] ?? "";
    return {
      text: tr("Gathering reminder: {title}").replace("{title}", title),
      href: { pathname: "/gathering/[id]", params: { id: item.gathering_id } },
      markRead: () =>
        Promise.resolve(db.rpc("gathering_notifications", { p_read: item.id })),
    };
  }
  const { data, error } = await db.rpc("prayer_snapshot");
  const notices = (error ? [] : (data?.notices ?? [])) as {
    id: string;
    kind: string;
    is_read: boolean;
    created_at: string;
    request?: { own?: boolean; prayed?: boolean };
  }[];
  // An invitation already prayed for is not news.
  const notice = notices
    .filter(
      (value) =>
        !value.is_read && !(value.kind !== "prayed" && value.request?.prayed),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (!notice) return null;
  return {
    text: tr(
      notice.kind === "prayed"
        ? "Someone prayed for you"
        : notice.kind === "time"
          ? "It is time to pray together"
          : "A prayer invitation",
    ),
    // Your own request lives under My requests; others under Pray for others.
    href: notice.request?.own
      ? { pathname: "/prayers", params: { tab: "mine" } }
      : "/prayers",
    markRead: () =>
      Promise.resolve(
        db.rpc("prayer_command", {
          p_action: "read",
          p_id: notice.id,
          p_data: {},
        }),
      ),
  };
}

/** A short, tappable notice on Home for something new; it fades on its own. */
export default function HomeNotice({ visible }: { visible: boolean }) {
  const tr = useInterfaceCopy();
  const { profile } = useApp();
  const counts = useUnreadCounts();
  const [kind, setKind] = useState<Kind | null>(null);
  const [item, setItem] = useState<Opened | null>(null);
  // Read through refs, so a redraw while the item loads never drops it.
  const words = useRef({ tr, language: profile.language });
  useEffect(() => {
    words.current = { tr, language: profile.language };
  }, [tr, profile.language]);
  const [opacity] = useState(() => new Animated.Value(0));
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!counts || !visible) return;
    const fresh = freshNotice(counts, announced);
    // Counts that went down (read elsewhere) lower the bar for the next one.
    announced = {
      messages: counts.messages,
      prayers: counts.prayers,
      activity: counts.activity,
      gatherings: counts.gatherings,
    };
    if (!fresh) return;
    let active = true;
    // Name the newest item when it can be found; otherwise a general notice.
    void newestItem(fresh, words.current.tr, words.current.language)
      .catch(() => null)
      .then((found) => {
        if (!active) return;
        setItem(found);
        setKind(fresh);
      });
    return () => {
      active = false;
    };
  }, [counts, visible]);

  useEffect(() => {
    if (!kind) return;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    hide.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => setKind(null));
    }, SHOWN_MS);
    return () => {
      if (hide.current) clearTimeout(hide.current);
    };
  }, [kind, opacity]);

  if (!kind || !visible) return null;
  const notice = NOTICE[kind];
  const text = item?.text ?? tr(notice.text);
  return (
    <Animated.View style={[s.wrap, { opacity }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={tr("Opens the notification")}
        onPress={() => {
          setKind(null);
          track("home_notice_opened", { kind });
          // Going to the item counts as reading it; the Notifications page
          // keeps anything else, and the general notice marks nothing.
          if (item?.markRead)
            void item
              .markRead()
              .then(() => refreshPrayerBadges())
              .catch(() => {});
          router.push(item?.href ?? notice.href);
        }}
        style={s.notice}
      >
        <Ionicons name={notice.icon} size={15} color="#E6CE99" />
        <Text style={s.text} numberOfLines={2}>
          {text}
        </Text>
        <Ionicons name="chevron-forward" size={14} color="#E6CE99" />
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { alignSelf: "center", maxWidth: "92%" },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#302C28E6",
    borderWidth: 1,
    borderColor: "#C9A45C66",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  text: { flexShrink: 1, fontSize: 13, color: "#FFF8E9" },
});
