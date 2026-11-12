import { useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { TextAction } from "./CommunityControls";
import { Subheading, colors, useSurfaceColors } from "./community-ui";
import { useApp } from "../lib/state";
import { copy } from "../lib/content";
import { Gathering } from "../lib/gatherings";
import { gatheringTheme } from "../lib/gathering-theme";
import { communityCopy } from "../lib/community-copy";
import {
  type HolyDayId,
  holyDayArt,
  holyDayCalendar,
  holyDayName,
  holyDaysForCalendar,
} from "../lib/holy-days";
import {
  holyDayDateLight,
  holyDayArtScale,
  holyDayDateShape,
  holyDayImages,
} from "../lib/holy-day-art";
// A feast's drawing holds its date: the number is printed in the drawing's
// calm middle (inside the wreath, on the egg), never over or under it.
const HOLDER_WIDTH = 45,
  DATE_LINE = 20,
  dateTop = (width: number) =>
    width * holyDayDateShape.ratio * holyDayDateShape.centre - DATE_LINE / 2;
function DateHolder({
  id,
  day,
  width = HOLDER_WIDTH,
  dim = false,
}: {
  id: HolyDayId;
  day: number;
  width?: number;
  dim?: boolean;
}) {
  const art = holyDayArt[id];
  return (
    <View
      accessible={false}
      style={{
        width,
        height: width * holyDayDateShape.ratio,
        alignItems: "center",
      }}
    >
      <Image
        source={holyDayImages[art]}
        accessible={false}
        style={{
          position: "absolute",
          width,
          height: width * holyDayDateShape.ratio,
          opacity: dim ? 0.55 : 1,
        }}
      />
      <Text
        style={{
          position: "absolute",
          top: dateTop(width),
          lineHeight: DATE_LINE,
          fontSize: 15,
          fontWeight: "700",
          color: holyDayDateLight[art] ? colors.white : colors.ink,
        }}
      >
        {day}
      </Text>
    </View>
  );
}
// Shows a holy day's drawing at its own size (tall drawings a little smaller),
// shifted so its date sits on exactly the same line as every other date.
function ScaledDateHolder({
  id,
  day,
  dim = false,
}: {
  id: HolyDayId;
  day: number;
  dim?: boolean;
}) {
  const width = HOLDER_WIDTH * (holyDayArtScale[holyDayArt[id]] ?? 1);
  return (
    <View style={{ marginTop: dateTop(HOLDER_WIDTH) - dateTop(width) }}>
      <DateHolder id={id} day={day} width={width} dim={dim} />
    </View>
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
            matches = gatherings.filter(
              (g) =>
                g.status === "published" &&
                key(new Date(g.starts_at)) === key(d),
            ),
            first = matches[0],
            has = !!first,
            on = selected === key(d),
            isToday = key(d) === todayKey,
            past = d.getTime() < todayStart,
            feasts = holyDays.filter((h) => h.day === day),
            feast = feasts[0];
          return (
            <View key={i} style={{ width: "14.28%", padding: 2 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={[
                  d.toLocaleDateString(profile.language),
                  ...feasts.map((h) => holyDayName(h.id, profile.language)),
                  ...(has
                    ? [
                        communityCopy(
                          profile.language,
                          matches.length === 1
                            ? "oneGathering"
                            : "gatheringCount",
                        ).replace("{count}", String(matches.length)),
                      ]
                    : []),
                ].join(", ")}
                onPress={() => setSelected(on ? "" : key(d))}
                style={{
                  height: 56,
                  alignItems: "center",
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
                {feast ? (
                  <ScaledDateHolder id={feast.id} day={day} dim={past && !on} />
                ) : (
                  <Text
                    style={{
                      position: "absolute",
                      top: dateTop(HOLDER_WIDTH),
                      lineHeight: DATE_LINE,
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
                )}
                {/* A gathering that day: a dot under the date, or at the
                    corner when a feast's drawing fills the cell. */}
                {!!first && (
                  <View
                    accessible={false}
                    style={[
                      {
                        position: "absolute",
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: on
                          ? colors.white
                          : gatheringTheme(first).accent,
                        opacity: past && !on ? 0.45 : 1,
                      },
                      feast
                        ? {
                            top: 1,
                            right: -1,
                            width: 9,
                            height: 9,
                            borderRadius: 4.5,
                            borderWidth: 1.5,
                            borderColor: colors.white,
                          }
                        : { bottom: 6 },
                    ]}
                  />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
      <Text style={{ fontSize: 12, color: surface.muted }}>
        {communityCopy(profile.language, "calendarLegend")}
      </Text>
      {!!holyDays.length && (
        <View
          style={{
            gap: 6,
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
                  gap: 14,
                }}
              >
                <ScaledDateHolder id={h.id} day={h.day} />
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
                    fontSize: 15,
                    lineHeight: 21,
                    color: surface.ink,
                  }}
                >
                  {name}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
