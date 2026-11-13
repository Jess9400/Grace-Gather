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
  const style = {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box" as const,
    minHeight: 52,
    borderRadius: 14,
    border: `1px solid ${colors.line}`,
    padding: "12px 14px",
    background: colors.white,
    color: colors.ink,
    font: "inherit",
    fontSize: 16,
    colorScheme: "dark",
  };
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <label
        htmlFor={`${id}-date`}
        style={{ display: "grid", gap: 8, color: colors.ink }}
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
        style={{ display: "grid", gap: 8, color: colors.ink }}
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
