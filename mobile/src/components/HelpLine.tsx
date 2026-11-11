import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "./quiet-ui";
import { useApp } from "../lib/state";
import { helpCopy, helplineText, helplineUrl } from "../lib/help-lines";

// A short line that says where to find a person to talk to right now.
// "gentle" is for heavy moments that are not an emergency.
export default function HelpLine({
  gentle = false,
  bare = false,
}: {
  gentle?: boolean;
  // Only the helpline itself, under a card that already asks the question.
  bare?: boolean;
}) {
  const { profile } = useApp();
  const lang = profile.language;
  const url = helplineUrl(profile);
  return (
    <View style={s.wrap}>
      {!bare && (
        <Text style={s.lead}>{helpCopy(lang, gentle ? "gentle" : "ask")}</Text>
      )}
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL(url)}
        hitSlop={6}
      >
        <Text style={s.line}>{helplineText(profile)}</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { gap: 3 },
  lead: { fontSize: 13, lineHeight: 19, color: colors.ink, fontWeight: "600" },
  line: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    textDecorationLine: "underline",
    textDecorationColor: colors.line,
  },
});
