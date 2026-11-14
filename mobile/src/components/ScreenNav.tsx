import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useApp } from "../lib/state";
import { churchCopy } from "../lib/church-copy";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import MemberAvatar from "./MemberAvatar";

/** Persistent navigation for pages opened on top of the main tabs. */
export default function ScreenNav({ home = false, dirty = false }: { home?: boolean; dirty?: boolean }) {
  const tr = useInterfaceCopy();
  const { profile } = useApp();
  const pathname = usePathname();
  const onAccount = pathname === "/account";
  const [confirming, setConfirming] = useState(false);
  const nextAction = useRef<(() => void) | null>(null);
  function leave(action: () => void) {
    if (!dirty) return action();
    nextAction.current = action;
    setConfirming(true);
  }
  return (
    <>
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel={tr("Back")}
        onPress={() => leave(() => router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
        style={({ pressed }) => [styles.control, pressed && styles.pressed]}>
        <Ionicons name="chevron-back" size={24} color="#F4EBDA" />
      </Pressable>
      <Text style={styles.brand} numberOfLines={1}>GRACE &amp; GATHER</Text>
      {(home || onAccount) && <Pressable accessibilityRole="button"
        accessibilityLabel={churchCopy(profile.language, "home")}
        onPress={() => leave(() => router.dismissTo("/(tabs)"))}
        style={({ pressed }) => [styles.control, pressed && styles.pressed]}>
        <Ionicons name="home-outline" size={22} color="#F4EBDA" />
      </Pressable>}
      {!onAccount && <Pressable accessibilityRole="button" accessibilityLabel={tr("Account and settings")}
        onPress={() => leave(() => router.navigate("/account"))}
        style={({ pressed }) => [styles.control, pressed && styles.pressed]}><MemberAvatar /></Pressable>}
    </View>
    <Modal visible={confirming} transparent animationType="none" onRequestClose={() => setConfirming(false)}>
      <View style={styles.scrim} accessibilityViewIsModal>
        <View style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.question}>{tr("Leave without saving your draft?")}</Text>
          <Pressable accessibilityRole="button" onPress={() => setConfirming(false)} style={styles.keep}>
            <Text style={styles.keepText}>{tr("Keep editing")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => {
            const action = nextAction.current;
            nextAction.current = null;
            setConfirming(false);
            action?.();
          }} style={styles.discard}>
            <Text style={styles.discardText}>{tr("Discard")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  bar: { width: "100%", maxWidth: 620, alignSelf: "center", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, minHeight: 52 },
  brand: { color: "#F4EBDA", fontWeight: "600", fontSize: 12, letterSpacing: 2.1, flex: 1, marginLeft: 4 },
  control: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.7, backgroundColor: "#F4EBDA14" },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", alignItems: "center", justifyContent: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 390, backgroundColor: "#2A221B", borderRadius: 20, padding: 24, gap: 14 },
  question: { color: "#F4EBDA", fontSize: 20, lineHeight: 28, fontWeight: "600" },
  keep: { backgroundColor: "#F1E4CB", minHeight: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  keepText: { color: "#1B1612", fontSize: 16, fontWeight: "600" },
  discard: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  discardText: { color: "#F4EBDA", fontSize: 16 },
});
