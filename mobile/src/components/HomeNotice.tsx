import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useUnreadCounts, type UnreadCounts } from "../lib/prayers";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { freshNotice, type NoticeKind } from "../lib/home-notice";

type Kind = NoticeKind;
const NOTICE: Record<Kind, { text: string; icon: keyof typeof Ionicons.glyphMap; href: Href }> = {
  messages: {
    text: "You have a new message",
    icon: "chatbubble-ellipses-outline",
    href: { pathname: "/friends", params: { view: "friends" } },
  },
  prayers: { text: "New prayer notification", icon: "heart-outline", href: "/notifications" },
  activity: { text: "New reply in a discussion", icon: "chatbubbles-outline", href: "/notifications" },
  gatherings: { text: "A gathering is coming up", icon: "calendar-outline", href: "/notifications" },
};
const SHOWN_MS = 6000;
// What has already been announced in this app session, so leaving Home and
// coming back does not repeat it. Only a rise in a count is news.
let announced: Pick<UnreadCounts, Kind> | null = null;

/** A short, tappable notice on Home for something new; it fades on its own. */
export default function HomeNotice({ visible }: { visible: boolean }) {
  const tr = useInterfaceCopy();
  const counts = useUnreadCounts();
  const [kind, setKind] = useState<Kind | null>(null);
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
    const show = setTimeout(() => setKind(fresh), 0);
    return () => clearTimeout(show);
  }, [counts, visible]);

  useEffect(() => {
    if (!kind) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    hide.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }).start(() =>
        setKind(null),
      );
    }, SHOWN_MS);
    return () => {
      if (hide.current) clearTimeout(hide.current);
    };
  }, [kind, opacity]);

  if (!kind || !visible) return null;
  const notice = NOTICE[kind];
  return (
    <Animated.View style={[s.wrap, { opacity }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={tr("Opens the notification")}
        onPress={() => {
          setKind(null);
          router.push(notice.href);
        }}
        style={s.notice}
      >
        <Ionicons name={notice.icon} size={15} color="#E6CE99" />
        <Text style={s.text}>{tr(notice.text)}</Text>
        <Ionicons name="chevron-forward" size={14} color="#E6CE99" />
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { alignSelf: "center" },
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
  text: { fontSize: 13, color: "#FFF8E9" },
});
