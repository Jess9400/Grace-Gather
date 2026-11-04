import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Disclosure, TextAction } from "./CommunityControls";
import { Subheading, colors } from "./community-ui";
import { useApp } from "../lib/state";
import { copy } from "../lib/content";
import { designCopy } from "../lib/design-copy";
import { Gathering } from "../lib/gatherings";
export default function GatheringCalendar({
  gatherings,
  selected,
  onSelect,
}: {
  gatherings: Gathering[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const { profile } = useApp(),
    t = (k: string) => copy(profile.language, k),
    d = (k: Parameters<typeof designCopy>[1]) =>
      designCopy(profile.language, k),
    setSelected = onSelect;
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    offset = month.getDay(),
    key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return (
    <Disclosure title={d("calendar")}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TextAction
          icon="chevron-back"
          iconOnly
          title={t("previousMonth")}
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        />
        <Subheading>
          {month.toLocaleDateString(profile.language, {
            month: "long",
            year: "numeric",
          })}
        </Subheading>
        <TextAction
          icon="chevron-forward"
          iconOnly
          title={t("nextMonth")}
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: 7 }, (_, i) => (
          <View key={"w" + i} style={{ width: "14.28%", paddingVertical: 9 }}>
            <Text
              style={{
                textAlign: "center",
                fontSize: 11,
                color: colors.muted,
              }}
            >
              {new Date(2026, 10, 1 + i).toLocaleDateString(profile.language, {
                weekday: "short",
              })}
            </Text>
          </View>
        ))}
        {Array.from({ length: offset + days }, (_, i) => {
          const day = i - offset + 1;
          if (day < 1) return <View key={i} style={{ width: "14.28%" }} />;
          const d = new Date(month.getFullYear(), month.getMonth(), day),
            has = gatherings.some((g) => key(new Date(g.starts_at)) === key(d));
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === key(d) }}
              accessibilityLabel={d.toLocaleDateString(profile.language)}
              onPress={() => setSelected(selected === key(d) ? "" : key(d))}
              style={{
                width: "14.28%",
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                backgroundColor:
                  selected === key(d)
                    ? colors.green
                    : has
                      ? colors.pale
                      : "transparent",
              }}
            >
              <Text
                style={{
                  color: selected === key(d) ? colors.white : colors.ink,
                }}
              >
                {day}
                {has ? " •" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Disclosure>
  );
}
