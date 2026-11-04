import { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ViewStyle,
  ScrollViewInstance,
} from "react-native";
import { BibleVerse } from "../lib/bible";
import { colors, serif } from "./quiet-ui";
export default function ChapterWindow({
  title,
  verses,
  selectedNumber,
}: {
  title: string;
  verses: BibleVerse[];
  selectedNumber?: string;
}) {
  const { height } = useWindowDimensions();
  const scroll = useRef<ScrollViewInstance>(null),
    positioned = useRef(false);
  return (
    <View testID="chapter-window" style={s.frame}>
      <View style={s.header}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.hint}>Scroll to read</Text>
      </View>
      <ScrollView
        ref={scroll}
        testID="chapter-scroll"
        accessibilityLabel="Chapter text"
        nestedScrollEnabled
        directionalLockEnabled
        bounces={false}
        persistentScrollbar
        showsVerticalScrollIndicator
        style={[
          { height: Math.max(250, Math.min(370, height * 0.43)) },
          Platform.OS === "web" &&
            ({ overscrollBehavior: "contain" } as ViewStyle),
        ]}
        contentContainerStyle={s.content}
      >
        {verses.map((verse) => (
          <View
            key={verse.id}
            onLayout={(e) => {
              if (verse.number === selectedNumber && !positioned.current) {
                positioned.current = true;
                scroll.current?.scrollTo({
                  y: Math.max(0, e.nativeEvent.layout.y - 16),
                  animated: false,
                });
              }
            }}
            style={[s.row, verse.number === selectedNumber && s.selected]}
          >
            <Text selectable style={s.scripture}>
              <Text style={s.number}>{verse.number} </Text>
              {verse.text}
            </Text>
            {!verse.text &&
              verse.notes.map((note, i) => (
                <Text key={i} style={s.note}>
                  {note}
                </Text>
              ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.pale,
    gap: 3,
  },
  title: { fontSize: 14, lineHeight: 21, color: colors.ink, fontWeight: "600" },
  hint: { fontSize: 11, color: colors.muted },
  content: { padding: 12, gap: 6 },
  row: { paddingHorizontal: 8, paddingVertical: 9, borderRadius: 10 },
  selected: { backgroundColor: "#B28A3E20" },
  scripture: {
    fontFamily: serif,
    fontSize: 19,
    lineHeight: 32,
    color: colors.ink,
  },
  number: { fontFamily: undefined, fontSize: 11, color: colors.goldInk },
  note: { fontSize: 13, lineHeight: 21, color: colors.muted },
});
