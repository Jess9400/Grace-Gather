import { useState } from "react";
import { Text, View, type StyleProp, type TextStyle } from "react-native";
import { TextAction } from "./CommunityControls";
import { translationCopy } from "../lib/conversation-translations";

export function TranslatedText({
  original,
  translation,
  language,
  style,
  lines,
  heading = false,
}: {
  original: string;
  translation?: string;
  language: string;
  style?: StyleProp<TextStyle>;
  lines?: number;
  heading?: boolean;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const different = !!translation && translation.trim() !== original.trim();
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        accessibilityRole={heading ? "header" : undefined}
        numberOfLines={lines}
        style={style}
      >
        {different && !showOriginal ? translation : original}
      </Text>
      {different && (
        <TextAction
          title={translationCopy(
            language,
            showOriginal ? "translated" : "original",
          )}
          onPress={() => setShowOriginal(!showOriginal)}
        />
      )}
    </View>
  );
}
