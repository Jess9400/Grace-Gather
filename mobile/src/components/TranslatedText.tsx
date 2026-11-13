import { useState } from "react";
import { Pressable, Text, View, type StyleProp, type TextStyle } from "react-native";
import { colors } from "./quiet-ui";
import { translationCopy } from "../lib/conversation-translations";

export function TranslationToggle({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10}
    style={{ alignSelf: "flex-start", paddingVertical: 4 }}>
    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "400" }}>{title}</Text>
  </Pressable>;
}

export function TranslatedText({
  original,
  translation,
  language,
  style,
  lines,
  heading = false,
  fill = false,
}: {
  original: string;
  translation?: string;
  language: string;
  style?: StyleProp<TextStyle>;
  lines?: number;
  heading?: boolean;
  fill?: boolean;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const different = !!translation && translation.trim() !== original.trim();
  return (
    <View style={[{ minWidth: 0 }, fill && { flex: 1 }]}>
      <Text
        accessibilityRole={heading ? "header" : undefined}
        numberOfLines={lines}
        style={style}
      >
        {different && !showOriginal ? translation : original}
      </Text>
      {different && (
        <TranslationToggle title={translationCopy(language, showOriginal ? "translated" : "original")}
          onPress={() => setShowOriginal(!showOriginal)} />
      )}
    </View>
  );
}
