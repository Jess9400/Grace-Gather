import { Field } from "./quiet-ui";
import { useInterfaceCopy } from "../lib/use-interface-copy";
export type PrayerScheduleProps = {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
};
export default function PrayerSchedule({
  date,
  time,
  onDateChange,
  onTimeChange,
}: PrayerScheduleProps) {
  const tr = useInterfaceCopy();
  return (
    <>
      <Field
        label={tr("Date (YYYY-MM-DD)")}
        value={date}
        onChangeText={onDateChange}
        placeholder="YYYY-MM-DD"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={10}
      />
      <Field
        label={tr("Time (HH:mm, 24-hour)")}
        value={time}
        onChangeText={onTimeChange}
        placeholder="HH:mm"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={5}
      />
    </>
  );
}
