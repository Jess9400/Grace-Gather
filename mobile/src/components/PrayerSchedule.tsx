import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button, colors } from "./quiet-ui";
import { communityCopy } from "../lib/community-copy";
import { useApp } from "../lib/state";
import { useInterfaceCopy } from "../lib/use-interface-copy";
export type PrayerScheduleProps = {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  dateLabel?: string;
  timeLabel?: string;
};
export default function PrayerSchedule({
  date,
  time,
  onDateChange,
  onTimeChange,
  dateLabel,
  timeLabel,
}: PrayerScheduleProps) {
  const tr = useInterfaceCopy();
  const { profile } = useApp();
  const c = (key: string) => communityCopy(profile.language, key);
  const [mode, setMode] = useState<"date" | "time" | null>(null);
  const today = new Date();
  const two = (n: number) => String(n).padStart(2, "0");
  const todayString = `${today.getFullYear()}-${two(today.getMonth() + 1)}-${two(today.getDate())}`;
  const candidate = new Date(`${date || todayString}T${time || "12:00"}:00`);
  const current = Number.isNaN(candidate.getTime()) ? new Date() : candidate;
  const update = (value: Date, selectedMode: "date" | "time") => {
    if (selectedMode === "date")
      onDateChange(
        `${value.getFullYear()}-${two(value.getMonth() + 1)}-${two(value.getDate())}`,
      );
    else onTimeChange(`${two(value.getHours())}:${two(value.getMinutes())}`);
  };
  return (
    <View style={{ gap: 12 }}>
      {(["date", "time"] as const).map((kind) => (
        <View key={kind} style={{ gap: 6 }}>
          <Text style={{ color: colors.ink, fontSize: 13, fontWeight: "600" }}>
            {kind === "date"
              ? (dateLabel ?? tr("Prayer date"))
              : (timeLabel ?? tr("Prayer time"))}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode(kind)}
            style={{
              minHeight: 52,
              justifyContent: "center",
              paddingHorizontal: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.white,
            }}
          >
            <Text style={{ color: colors.ink, fontSize: 16 }}>
              {kind === "date"
                ? date
                  ? current.toLocaleDateString(profile.language, {
                      dateStyle: "medium",
                    })
                  : c("chooseDate")
                : time
                  ? current.toLocaleTimeString(profile.language, {
                      timeStyle: "short",
                    })
                  : c("chooseTime")}
            </Text>
          </Pressable>
        </View>
      ))}
      {mode && (
        <>
          <DateTimePicker
            value={current}
            mode={mode}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            themeVariant="dark"
            textColor={colors.ink}
            onChange={(event, value) => {
              if (value && event.type !== "dismissed") update(value, mode);
              if (Platform.OS !== "ios") setMode(null);
            }}
          />
          {Platform.OS === "ios" && (
            <Button
              secondary
              title={c("doneSelecting")}
              onPress={() => {
                update(current, mode);
                setMode(null);
              }}
            />
          )}
        </>
      )}
    </View>
  );
}
