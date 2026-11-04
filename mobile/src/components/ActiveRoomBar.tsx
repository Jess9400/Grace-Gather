import { Pressable, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioRoom } from "../lib/audio-room";
import { useApp } from "../lib/state";
import { storyText } from "../lib/discover";
import { communityCopy } from "../lib/community-copy";
import { colors } from "./community-ui";
import { TextAction } from "./CommunityControls";
export default function ActiveRoomBar() {
  const audio = useAudioRoom(),
    { profile } = useApp(),
    path = usePathname(),
    insets = useSafeAreaInsets();
  if (!audio.session || path.includes("/gathering/" + audio.session.id))
    return null;
  const s = audio.session,
    c = (k: string) => communityCopy(profile.language, k);
  return (
    <View
      style={{
        backgroundColor: colors.paper,
        borderTopColor: colors.gold,
        borderTopWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: Math.max(insets.bottom, 4),
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Pressable
        style={{ flex: 1, minHeight: 48, justifyContent: "center" }}
        accessibilityRole="button"
        onPress={() =>
          router.push({ pathname: "/gathering/[id]", params: { id: s.id } })
        }
      >
        <Text
          numberOfLines={1}
          style={{ color: colors.ink, fontWeight: "600" }}
        >
          {storyText(s.access.title, profile.language)}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {c(audio.connection)} · {c(audio.muted ? "muted" : "micOn")}
        </Text>
      </Pressable>
      {audio.canSpeak && (
        <TextAction
          icon={audio.muted ? "mic-off-outline" : "mic-outline"}
          iconOnly
          title={c(audio.muted ? "unmute" : "mute")}
          onPress={() => void audio.mic()}
        />
      )}
      <TextAction
        title={c("leaveRoom")}
        icon="exit-outline"
        iconOnly
        onPress={() => void audio.leave()}
      />
    </View>
  );
}
