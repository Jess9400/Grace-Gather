import { useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { TextAction } from "./CommunityControls";
import { Subheading, colors, useSurfaceColors } from "./community-ui";
import { useApp } from "../lib/state";
import { copy } from "../lib/content";
import { Gathering } from "../lib/gatherings";
import { gatheringTheme } from "../lib/gathering-theme";
import {
  type HolyDayId,
  holyDayArt,
  holyDayCalendar,
  holyDayName,
  holyDaysForCalendar,
} from "../lib/holy-days";
import { holyDayImages } from "../lib/holy-day-art";
// A feast's small illustration: a wreath for Christmas, eggs for Easter.
function HolyDayMark({
  id,
  size,
  opacity = 1,
}: {
  id: HolyDayId;
  size: number;
  opacity?: number;
}) {
  return (
    <Image
      source={holyDayImages[holyDayArt[id]]}
      accessible={false}
      style={{ width: size, height: size, opacity }}
    />
  );
}
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
    setSelected = onSelect,
    surface = useSurfaceColors();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    offset = month.getDay(),
    key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const today = new Date(),
    todayKey = key(today),
    todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime();
  // The tradition chosen at set-up decides which holy days the month shows.
  // A year is a dozen days of integer arithmetic, so it is simply recomputed.
  const holyDays = holyDaysForCalendar(
    holyDayCalendar(profile),
    month.getFullYear(),
  ).filter((h) => h.month === month.getMonth() + 1);
  return (
    <View style={{ gap: 8 }}>
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
            first = gatherings.find(
              (g) => key(new Date(g.starts_at)) === key(d),
            ),
            has = !!first,
            on = selected === key(d),
            isToday = key(d) === todayKey,
            past = d.getTime() < todayStart,
            feasts = holyDays.filter((h) => h.day === day);
          return (
            <View key={i} style={{ width: "14.28%", padding: 2 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={[
                  d.toLocaleDateString(profile.language),
                  ...feasts.map((h) => holyDayName(h.id, profile.language)),
                ].join(", ")}
                onPress={() => setSelected(on ? "" : key(d))}
                style={{
                  minHeight: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  paddingVertical: 2,
                  borderRadius: 14,
                  backgroundColor: on
                    ? colors.green
                    : isToday
                      ? colors.pale
                      : "transparent",
                  borderWidth: isToday && !on ? 2 : 0,
                  borderColor: colors.gold,
                }}
              >
                {/* Every cell keeps this slot, so the numbers stay in line. */}
                <View
                  accessible={false}
                  style={{ height: 25, justifyContent: "center" }}
                >
                  {!!feasts.length && (
                    <HolyDayMark
                      id={feasts[0].id}
                      size={25}
                      opacity={past && !on ? 0.6 : 1}
                    />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: isToday ? "700" : "500",
                    color: on
                      ? colors.white
                      : past && !has
                        ? colors.muted
                        : colors.ink,
                  }}
                >
                  {day}
                </Text>
                <View
                  accessible={false}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: first
                      ? on
                        ? colors.white
                        : gatheringTheme(first).accent
                      : "transparent",
                    opacity: past && !on ? 0.45 : 1,
                  }}
                />
              </Pressable>
            </View>
          );
        })}
      </View>
      {!!holyDays.length && (
        <View
          style={{
            gap: 8,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: surface.line,
          }}
        >
          {holyDays.map((h) => {
            const name = holyDayName(h.id, profile.language);
            return (
              <View
                key={h.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <HolyDayMark id={h.id} size={36} />
                <Text
                  accessibilityLabel={`${new Date(
                    h.year,
                    h.month - 1,
                    h.day,
                  ).toLocaleDateString(profile.language, {
                    day: "numeric",
                    month: "long",
                  })}, ${name}`}
                  style={{
                    flex: 1,
                    fontSize: 14,
                    lineHeight: 20,
                    color: surface.ink,
                  }}
                >
                  <Text style={{ fontWeight: "700" }}>{h.day}</Text>
                  {" · " + name}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
