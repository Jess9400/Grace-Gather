import { interfaceCopy } from "../lib/interface-copy";
import { testimonyCopy } from "../lib/testimony-copy";
import { communityCopy } from "../lib/community-copy";
import { View, Text, Pressable, Share } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Body, colors } from "./community-ui";
import { TextAction } from "./CommunityControls";
import { useApp } from "../lib/state";
import {
  Story,
  storyText,
  excerpt,
  storyLink,
  useInteractions,
} from "../lib/discover";
import { copy } from "../lib/content";
export function StoryActions({
  item,
  interactions,
}: {
  item: Story;
  interactions: ReturnType<typeof useInteractions>;
}) {
  const { profile } = useApp(),
    c = (k: string) => communityCopy(profile.language, k),
    t = (k: string) => copy(profile.language, k),
    s = interactions.state[item.id];
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <TextAction
        icon={s?.liked ? "heart" : "heart-outline"}
        selected={s?.liked}
        title={`${t("like")}${s?.likes ? " " + s.likes : ""}`}
        disabled={interactions.pending.includes(item.id)}
        onPress={() => void interactions.toggle(item.id, "like")}
      />
      <TextAction
        icon="chatbubble-outline"
        title={`${t("comment")}${s?.comments ? " " + s.comments : ""}`}
        iconOnly
        onPress={() =>
          router.push({
            pathname: "/story/[id]",
            params: { id: item.id, comments: "1" },
          })
        }
      />
      <TextAction
        icon="share-outline"
        title={t("share")}
        iconOnly
        onPress={() =>
          void Share.share({
            message:
              storyText(item.title, profile.language) +
              "\n" +
              storyLink(item.id),
          })
            .then((r) => {
              if (r.action === Share.sharedAction)
                void interactions.toggle(item.id, "share");
            })
            .catch(() => {})
        }
      />
      <TextAction
        icon={s?.saved ? "bookmark" : "bookmark-outline"}
        selected={s?.saved}
        title={c(s?.saved ? "saved" : "save")}
        iconOnly
        disabled={interactions.pending.includes(item.id)}
        onPress={() => void interactions.toggle(item.id, "save")}
      />
    </View>
  );
}
export default function DiscoverPost({
  item,
  interactions,
}: {
  item: Story;
  interactions: ReturnType<typeof useInteractions>;
}) {
  const { profile } = useApp(),
    c = (k: string) => communityCopy(profile.language, k);
  const open = () =>
    router.push({ pathname: "/story/[id]", params: { id: item.id } });
  const body = storyText(item.summary, profile.language);
  return (
    <View
      style={{
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        gap: 12,
      }}
    >
      {(!item.title?.[profile.language] ||
        !item.summary?.[profile.language]) && (
        <Body small>
          {interfaceCopy(
            profile.language,
            "Translation is not available for this item. The original text is shown.",
          )}
        </Body>
      )}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View
          style={{
            height: 36,
            width: 36,
            borderRadius: 18,
            backgroundColor: "#FFFDF914",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={
              item.origin === "community" ? "person-outline" : "leaf-outline"
            }
            size={18}
            color={colors.gold}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "600" }}>
            {item.origin === "community" && item.anonymous
              ? testimonyCopy(profile.language, "anonymousName")
              : item.source || "Grace & Gather"}
          </Text>
          <Text style={{ color: colors.inactive, fontSize: 11, marginTop: 3 }}>
            {item.origin === "community"
              ? c("communityTestimony")
              : item.origin === "news"
                ? c("news")
                : item.type === "stories"
                  ? c("historical")
                  : c("reflection")}
            {item.publishedAt
              ? " · " +
                new Date(item.publishedAt).toLocaleDateString(profile.language)
              : ""}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={storyText(item.title, profile.language)}
        onPress={open}
      >
        <Text
          style={{
            color: colors.ink,
            fontSize: 21,
            lineHeight: 28,
            fontWeight: "600",
          }}
        >
          {storyText(item.title, profile.language)}
        </Text>
      </Pressable>
      {excerpt(body).map((p, i) => (
        <Text
          key={i}
          style={{ color: colors.ink, fontSize: 16, lineHeight: 25 }}
        >
          {p}
        </Text>
      ))}
      {!!item.tags?.length && (
        <Body small>{item.tags.slice(0, 2).join(" · ")}</Body>
      )}
      <TextAction title={c("readDeeper")} icon="arrow-forward" onPress={open} />
      <StoryActions item={item} interactions={interactions} />
    </View>
  );
}
