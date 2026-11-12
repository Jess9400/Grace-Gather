import { useCallback, useRef, type RefObject } from "react";
import {
  Keyboard,
  Platform,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from "react-native";
import { useFocusEffect } from "expo-router";

// Room kept above the keyboard under a focused field: enough to see the
// button below it (Send, Start a discussion, Verify), not just the caret.
const BELOW = 110;
// The field's own top never scrolls closer than this to the top of the screen.
const TOP_MARGIN = 100;

// On iPhone, when the keyboard opens over a page, scroll that page so the
// focused field and the button under it stay in view. Only the screen being
// shown reacts. Returns the page's onScroll handler (it tracks the offset).
export function useKeyboardReveal(
  scroll: RefObject<ScrollViewInstance | null>,
): (event: NativeSyntheticEvent<NativeScrollEvent>) => void {
  const offset = useRef(0);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "ios") return;
      const sub = Keyboard.addListener("keyboardDidShow", (event) => {
        const input = TextInput.State.currentlyFocusedInput();
        if (!input) return;
        const keyboardTop = event.endCoordinates.screenY;
        input.measureInWindow((_x, y, _width, height) => {
          const hidden = y + height + BELOW - keyboardTop;
          const by = Math.min(hidden, y - TOP_MARGIN);
          if (by > 0)
            scroll.current?.scrollTo({
              y: offset.current + by,
              animated: true,
            });
        });
      });
      return () => sub.remove();
    }, [scroll]),
  );
  return useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
  }, []);
}
