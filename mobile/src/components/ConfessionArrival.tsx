import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { useReducedMotion } from "../lib/use-reduced-motion";
import { confessionColors as room } from "../lib/confession-theme";
export function ConfessionLattice({ height = 180 }: { height?: number }) {
  return (
    <Image
      source={require("../../assets/confession/walnut-lattice.png")}
      resizeMode="cover"
      accessible={false}
      style={{ width: "100%", height, backgroundColor: room.background }}
    />
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
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  return (
    <Modal
      visible
      animationType={reduced ? "none" : "fade"}
      onRequestClose={onCancel}
    >
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.content}>
          <View>
            <ConfessionLattice
              height={Math.min(420, Math.max(180, height * 0.43))}
            />
            <View style={s.top}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr("Back")}
                onPress={onCancel}
                style={s.back}
              >
                <Ionicons name="chevron-back" size={26} color={room.ink} />
              </Pressable>
              <Text style={s.label}>{tr("Confession")}</Text>
            </View>
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
              {tr("Community support. Not sacramental confession.")}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: room.background },
  content: { flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center" },
  top: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  back: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
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
