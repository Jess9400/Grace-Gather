import { useId } from "react";
import { colors } from "./quiet-ui";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import type { PrayerScheduleProps } from "./PrayerSchedule";
export default function PrayerSchedule({
  date,
  time,
  onDateChange,
  onTimeChange,
  dateLabel,
  timeLabel,
}: PrayerScheduleProps) {
  const tr = useInterfaceCopy();
  const id = useId();
  // iPhone Safari gives date and time boxes a built-in minimum width; without
  // these rules they stretch past the screen edge.
  const style = {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    WebkitAppearance: "none" as const,
    appearance: "none" as const,
    textAlign: "left" as const,
    boxSizing: "border-box" as const,
    minHeight: 52,
    borderRadius: 14,
    border: `1px solid ${colors.line}`,
    padding: "12px 14px",
    background: colors.white,
    color: colors.ink,
    font: "inherit",
    fontSize: 16,
    fontWeight: 400,
    colorScheme: "dark",
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16, minWidth: 0 }}>
      <label
        htmlFor={`${id}-date`}
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, minWidth: 0, color: colors.ink, fontSize: 13, fontWeight: 600 }}
      >
        {dateLabel ?? tr("Prayer date")}
        <input
          id={`${id}-date`}
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          required
          style={style}
        />
      </label>
      <label
        htmlFor={`${id}-time`}
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, minWidth: 0, color: colors.ink, fontSize: 13, fontWeight: 600 }}
      >
        {timeLabel ?? tr("Prayer time")}
        <input
          id={`${id}-time`}
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          required
          step={60}
          style={style}
        />
      </label>
    </div>
  );
}
