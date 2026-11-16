import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../lib/state";
import { safetyCopy } from "../lib/safety-copy";
import { useSurfaceColors } from "./community-ui";

export default function SafetyFooter() {
  const { profile } = useApp();
  const surface = useSurfaceColors();
  const text = safetyCopy(profile.language);
  return <View style={{ gap: 8, marginTop: 18 }}>
    <Pressable accessibilityRole="link" onPress={() => router.push("/help")} hitSlop={8}>
      <Text style={{ color: surface.ink, fontSize: 13, lineHeight: 19, textDecorationLine: "underline" }}>{text.link}</Text>
    </Pressable>
    <Text style={{ color: surface.muted, fontSize: 12, lineHeight: 18 }}>{text.note}</Text>
  </View>;
}
