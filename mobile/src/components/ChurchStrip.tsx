import { useCallback, type ReactNode } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MemberAvatar from "./MemberAvatar";
import { useApp } from "../lib/state";
import { churchCopy, type ChurchWord } from "../lib/church-copy";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { holdAmbience, loadSoundOn } from "../lib/church-audio";
import {
  roomCrop,
  roomSpot,
  useChurchSnapshot,
  type RoomPlace,
} from "../lib/church-room";

// The strip melts into the top of the candlelit room.
const PAPER = "#211A14";
const LABEL: Record<RoomPlace, ChurchWord> = {
  bible: "atLectern",
  pews: "inPews",
  gather: "sideDoor",
  candles: "candles",
  confession: "quietCorner",
  window: "beneathWindow",
  altar: "atAltar",
  chats: "sideDoor",
};

// True once there is a picture of the church to show for this place.
export function useRoomStrip(place: RoomPlace) {
  return !!useChurchSnapshot()?.points[roomSpot(place)];
}

// The top of a room's screen: its part of the church, exactly as the walk-in
// left it, fading into the page. It also keeps the church sound playing softly
// while the room is open.
export default function ChurchStrip({
  place,
  back = false,
  action,
}: {
  place: RoomPlace;
  back?: boolean;
  // A small control kept from the screen's usual header (e.g. Refresh).
  action?: ReactNode;
}) {
  const snapshot = useChurchSnapshot();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile } = useApp();
  const tr = useInterfaceCopy();
  const at = snapshot?.points[roomSpot(place)];
  const shown = !!at;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let release: (() => void) | null = null;
      if (shown) setStatusBarStyle("light");
      void loadSoundOn().then((on) => {
        if (active && on) release = holdAmbience("soft");
      });
      return () => {
        active = false;
        release?.();
        if (shown) setStatusBarStyle("dark");
      };
    }, [shown]),
  );
  if (!snapshot || !at) return null;
  const crop = roomCrop(place, insets.top, at, snapshot, width);
  return (
    <View style={[st.strip, { height: crop.height }]}>
      <View pointerEvents="none" style={{ position: "absolute", width: crop.width, height: crop.imageHeight, left: crop.left, top: crop.top, overflow: "hidden" }}>
        {snapshot.artStage && snapshot.artStage.width < snapshot.width ? (
          <>
            <Image source={{ uri: snapshot.uri }} accessible={false} resizeMode="cover" blurRadius={24} style={st.fullImage} />
            <View style={st.wideShade} />
            <View style={{ position: "absolute", top: 0, bottom: 0, overflow: "hidden", left: (snapshot.artStage.left / snapshot.width) * crop.width, width: (snapshot.artStage.width / snapshot.width) * crop.width }}>
              <Image source={{ uri: snapshot.uri }} accessible={false} resizeMode="cover" style={st.fullImage} />
            </View>
          </>
        ) : <Image source={{ uri: snapshot.uri }} accessible={false} resizeMode="cover" style={st.fullImage} />}
      </View>
      {snapshot.night && !snapshot.nightArtwork && <View pointerEvents="none" style={st.evening} />}
      <View pointerEvents="none" style={st.topShade} />
      <View pointerEvents="none" style={st.bottomFade} />
      <View style={[st.row, { paddingTop: insets.top + 6 }]}>
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Back")}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/(tabs)")
            }
            style={({ pressed }) => [st.back, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={22} color="#302C28" />
          </Pressable>
        )}
        <Text style={st.label} numberOfLines={1}>
          {churchCopy(profile.language, LABEL[place]).toUpperCase()}
        </Text>
        {action && <View style={st.action}>{action}</View>}
        <Pressable
          accessibilityLabel={tr("Account and settings")}
          accessibilityRole="button"
          onPress={() => router.push("/account")}
          style={st.avatar}
        >
          <MemberAvatar />
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  strip: { width: "100%", overflow: "hidden", backgroundColor: "#211B16" },
  fullImage: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  wideShade: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(25,18,13,0.22)" },
  evening: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(17,18,31,0.32)" },
  topShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
    backgroundImage:
      "linear-gradient(180deg, rgba(25,19,14,0.45) 0%, rgba(25,19,14,0) 100%)",
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "30%",
    backgroundImage: `linear-gradient(180deg, rgba(33,26,20,0) 0%, ${PAPER} 100%)`,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,252,243,0.93)",
  },
  label: {
    flex: 1,
    color: "#FFF8E9",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.2,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  avatar: { padding: 4, marginLeft: "auto" },
  action: {
    borderRadius: 20,
    backgroundColor: "rgba(33,27,22,0.62)",
    paddingHorizontal: 4,
  },
});
