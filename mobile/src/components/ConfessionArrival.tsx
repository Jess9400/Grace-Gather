import { useCallback } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { useReducedMotion } from "../lib/use-reduced-motion";
import { confessionColors as room } from "../lib/confession-theme";
import { useApp } from "../lib/state";
import { isProtestant } from "../lib/church-calendar";
import { roomCopy } from "../lib/burden-copy";
import { holdAmbience, loadSoundOn } from "../lib/church-audio";
export function ConfessionLattice({ height = 180 }: { height?: number }) {
  return (
    <Image
      source={require("../../assets/confession/walnut-lattice-screen.jpg")}
      resizeMode="cover"
      accessible={false}
      style={{ width: "100%", height, backgroundColor: room.background }}
    />
  );
}
/** Decorative artwork stays behind the accessible content and scroll view. */
export function ConfessionBackground() {
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let release: (() => void) | undefined;
      void loadSoundOn().then((on) => {
        if (active && on) release = holdAmbience("soft");
      });
      return () => { active = false; release?.(); };
    }, []),
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
      <Image
        source={require("../../assets/confession/walnut-lattice-screen.jpg")}
        resizeMode="cover"
        accessible={false}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, s.shade]} />
    </View>
  );
}
export default function ConfessionArrival({
  onEntered,
  onCancel,
}: {
  onEntered: (audio?: boolean) => void;
  onCancel: () => void;
}) {
  const tr = useInterfaceCopy();
  const { profile } = useApp();
  const protestant = isProtestant(profile);
  const reduced = useReducedMotion();
  // A pop-up layer on iPhone does not learn where the status bar is, so the
  // screen's own insets keep the back button clear of the clock.
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible
      animationType={reduced ? "none" : "fade"}
      onRequestClose={onCancel}
    >
      <View style={[s.safe, { paddingBottom: insets.bottom }]}>
        <ConfessionBackground />
        <ScrollView contentContainerStyle={s.content}>
          <View style={[s.top, { marginTop: insets.top + 8 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr("Back")}
                onPress={onCancel}
                style={s.back}
              >
                <Ionicons name="chevron-back" size={26} color={room.ink} />
              </Pressable>
              <Text style={s.label}>{protestant ? roomCopy(profile.language, "confession", true) : tr("Confession")}</Text>
          </View>
          <View style={s.body}>
            <Text accessibilityRole="header" style={s.heading}>
              {tr("What’s weighing on your heart?")}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => onEntered(false)}
              style={s.primary}
            >
              <Ionicons
                name="create-outline"
                size={22}
                color={room.background}
              />
              <Text style={s.primaryText}>{tr("Put it into words")}</Text>
            </Pressable>
            {Platform.OS !== "web" && (
              <Pressable
                accessibilityRole="button"
                onPress={() => onEntered(true)}
                style={s.record}
              >
                <Ionicons name="mic-outline" size={22} color={room.ink} />
                <Text style={s.recordText}>{tr("Record instead")}</Text>
              </Pressable>
            )}
            <Text style={s.note}>
              {protestant ? roomCopy(profile.language, "roomSupport", true) : tr("Community support. Not sacramental confession.")}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: room.background },
  shade: { backgroundColor: "rgba(20, 13, 9, 0.67)" },
  content: { flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center" },
  top: {
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  // A soft dark circle keeps the arrow visible against the lattice.
  back: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20,14,10,0.62)",
  },
  label: {
    color: room.ink,
    fontSize: 14,
    letterSpacing: 3,
    textTransform: "uppercase",
    textShadowColor: "#1B100B",
    textShadowRadius: 5,
  },
  body: { flex: 1, padding: 28, gap: 24, justifyContent: "center" },
  heading: {
    color: room.ink,
    fontFamily: Platform.OS === "android" ? "serif" : "Georgia",
    fontSize: 32,
    lineHeight: 42,
    textAlign: "center",
  },
  primary: {
    minHeight: 56,
    backgroundColor: room.ink,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: room.background, fontSize: 18, flexShrink: 1 },
  record: {
    minHeight: 48,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  recordText: { color: room.ink, fontSize: 17 },
  note: {
    color: room.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
});
