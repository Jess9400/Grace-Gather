import { useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  localDevotionalDate,
  millisecondsUntilNextLocalDay,
} from "./devotional-calendar";
/** Refresh at the reader's local midnight and after returning from background. */
export function useLocalDay() {
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const now = new Date();
      setDate((old) =>
        localDevotionalDate(old) === localDevotionalDate(now) ? old : now,
      );
      timer = setTimeout(update, millisecondsUntilNextLocalDay(now) + 20);
    };
    timer = setTimeout(update, millisecondsUntilNextLocalDay(new Date()) + 20);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") update();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);
  return date;
}
