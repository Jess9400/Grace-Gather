import { useCallback, useEffect, useRef } from "react";
import type { LayoutChangeEvent, ScrollViewInstance } from "react-native";

// For a horizontal row of choices: when the selected one is partly off
// screen, scroll the row so all of it shows, with a little of its
// neighbours, so it is clear there is more to either side.
export function useRevealSelected(selected: string) {
  const scroll = useRef<ScrollViewInstance>(null);
  const width = useRef(0);
  const offset = useRef(0);
  const chips = useRef(new Map<string, { x: number; width: number }>());
  const reveal = useCallback((value: string, animated: boolean) => {
    const chip = chips.current.get(value);
    if (!chip || !width.current) return;
    const margin = 24;
    const left = chip.x - margin;
    const right = chip.x + chip.width + margin;
    if (left < offset.current)
      scroll.current?.scrollTo({ x: Math.max(0, left), animated });
    else if (right > offset.current + width.current)
      scroll.current?.scrollTo({ x: right - width.current, animated });
  }, []);
  useEffect(() => {
    reveal(selected, true);
  }, [selected, reveal]);
  return {
    ref: scroll,
    onLayout: (event: LayoutChangeEvent) => {
      width.current = event.nativeEvent.layout.width;
    },
    onScroll: (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      offset.current = event.nativeEvent.contentOffset.x;
    },
    scrollEventThrottle: 32,
    chipLayout: (value: string) => (event: LayoutChangeEvent) => {
      const { x, width: chipWidth } = event.nativeEvent.layout;
      chips.current.set(value, { x, width: chipWidth });
      // A choice selected before the row was measured (e.g. opened on it).
      if (value === selected) reveal(value, false);
    },
  };
}
