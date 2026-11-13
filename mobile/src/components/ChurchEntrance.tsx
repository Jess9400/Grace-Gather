import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { prepareChurchTimber } from "../lib/church-texture";
import { releaseContext } from "../lib/gl-recovery";
import {
  createChurchDoorRenderer,
  entranceFrame,
  ENTRANCE_MS,
} from "../lib/church-door-scene";
import { churchCopy } from "../lib/church-copy";
import type { Language } from "../lib/content";
import { serif } from "./quiet-ui";

const WEB_GL_OPTIONS = {
  alpha: false,
  antialias: true,
  preserveDrawingBuffer: true,
};
const DUSK = "#151112";
const IVORY = "#FFFCF3";

class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// The greeting at the church doors. The doors stay closed until the person
// chooses to enter; then they swing open and the view walks into the nave.
export default function ChurchEntrance({
  language,
  onEntered,
}: {
  language: Language;
  onEntered: () => void;
}) {
  const t = (key: Parameters<typeof churchCopy>[1]) =>
    churchCopy(language, key);
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [entering, setEntering] = useState(false);
  const [fade] = useState(() => new Animated.Value(0));
  const [words] = useState(() => new Animated.Value(0));
  const renderer = useRef<ReturnType<typeof createChurchDoorRenderer> | null>(
    null,
  );
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  const frame = useRef<number | null>(null);
  // Use elapsed time rather than frame count so a slow phone cannot get stuck
  // spending many extra seconds in the middle of the entrance.
  const started = useRef<number | null>(null);
  const progress = useRef(0);
  const lastDraw = useRef(0);
  const entranceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const born = useRef(0);
  const mounted = useRef(true);
  const finished = useRef(false);
  const abandoned = useRef(false);
  const latest = useRef({ open: 0, approach: 0 });
  // Held in a ref so a parent re-render (a clock tick, say) never restarts
  // the scene or the greeting mid-entrance.
  const entered = useRef(onEntered);
  useEffect(() => {
    entered.current = onEntered;
  }, [onEntered]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    if (entranceTimeout.current) clearTimeout(entranceTimeout.current);
    entranceTimeout.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    entered.current();
  }, []);

  const draw = useCallback((open: number, approach: number, time: number) => {
    latest.current = { open, approach };
    renderer.current?.draw(open, approach, time);
    context.current?.endFrameEXP();
  }, []);

  useEffect(() => {
    mounted.current = true;
    born.current = Date.now();
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => mounted.current && setReduced(value))
      .catch(() => {});
    const preference = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    const appState = AppState.addEventListener("change", (state) => {
      if (state !== "active" && started.current !== null) finish();
    });
    Animated.timing(words, {
      toValue: 1,
      duration: 900,
      delay: 250,
      useNativeDriver: true,
    }).start();
    return () => {
      mounted.current = false;
      if (entranceTimeout.current) clearTimeout(entranceTimeout.current);
      entranceTimeout.current = null;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      preference.remove();
      appState.remove();
      renderer.current?.dispose();
      renderer.current = null;
      releaseContext(context.current);
      context.current = null;
    };
  }, [finish, words]);

  useEffect(() => {
    if (ready || failed) return;
    const timeout = setTimeout(() => {
      abandoned.current = true;
      setFailed(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [ready, failed]);

  // One loop draws the idle doorway (lantern flicker, a breath of movement)
  // and, after the tap, the opening and the walk through the threshold.
  useEffect(() => {
    if (!ready || failed || (!entering && Platform.OS !== "web")) return;
    const tick = () => {
      if (!mounted.current || finished.current) return;
      const now = Date.now();
      // Avoid queueing graphics frames faster than the device can show them.
      if (Platform.OS !== "web" && now - lastDraw.current < 50) {
        frame.current = requestAnimationFrame(tick);
        return;
      }
      lastDraw.current = now;
      const time = reduced ? 0 : (now - born.current) / 1000;
      if (started.current === null) {
        try {
          draw(0, 0, time);
        } catch {
          setFailed(true);
          return;
        }
      } else {
        const realElapsed = Math.max(0, now - started.current);
        const elapsed =
          Platform.OS === "web"
            ? realElapsed
            : Math.min(realElapsed, progress.current + 160);
        progress.current = elapsed;
        const next = entranceFrame(elapsed);
        try {
          draw(next.open, next.approach, time);
        } catch {
          finish();
          return;
        }
        fade.setValue(next.fade);
        if (elapsed >= ENTRANCE_MS) {
          finish();
          return;
        }
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [draw, entering, failed, fade, finish, ready, reduced]);

  const enter = useCallback(() => {
    if (entering || finished.current) return;
    setEntering(true);
    if (reduced) {
      // A native animation completion callback is not guaranteed to arrive
      // after a graphics failure. Do not leave the opaque fade on screen.
      entranceTimeout.current = setTimeout(finish, 1200);
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start(() => finish());
      return;
    }
    // If graphics are still loading, keep the entrance visible and start the
    // opening as soon as it is ready rather than silently skipping it.
  }, [entering, fade, finish, reduced]);

  useEffect(() => {
    if (!entering || reduced || failed || !ready || started.current !== null)
      return;
    started.current = Date.now();
    Animated.timing(words, {
      toValue: 0,
      duration: 450,
      useNativeDriver: true,
    }).start();
    entranceTimeout.current = setTimeout(finish, ENTRANCE_MS + 2500);
  }, [entering, failed, finish, ready, reduced, words]);

  useEffect(() => {
    if (!entering || reduced || !failed || started.current !== null) return;
    entranceTimeout.current = setTimeout(finish, 1200);
    Animated.timing(fade, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start(() => finish());
  }, [entering, failed, fade, finish, reduced]);

  const onContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      try {
        const timber = await prepareChurchTimber();
        if (!mounted.current || finished.current || abandoned.current) return;
        context.current = gl;
        renderer.current = createChurchDoorRenderer(
          gl,
          timber,
          Platform.OS !== "web",
        );
        draw(0, 0, 0);
        setReady(true);
      } catch {
        setFailed(true);
      }
    },
    [draw],
  );

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={enter}
    >
      <View style={styles.root} accessibilityViewIsModal>
        <View
          style={StyleSheet.absoluteFill}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {!failed && (
            <SceneBoundary onFailure={() => setFailed(true)}>
              <GLView
                msaaSamples={0}
                {...(Platform.OS === "web"
                  ? {
                      webglContextAttributes: WEB_GL_OPTIONS,
                      onContextLost: () => setFailed(true),
                    }
                  : {})}
                style={
                  Platform.OS === "web"
                    ? StyleSheet.absoluteFill
                    : styles.nativeStage
                }
                onContextCreate={onContextCreate}
                onLayout={() => {
                  if (renderer.current) {
                    try {
                      draw(latest.current.open, latest.current.approach, 0);
                    } catch {
                      setFailed(true);
                    }
                  }
                }}
              />
            </SceneBoundary>
          )}
          <View
            pointerEvents="none"
            style={[styles.shade, { height: 300 + insets.top }]}
          />
          <View pointerEvents="none" style={styles.floorShade} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("enter")}
          accessibilityHint={t("tapDoors")}
          onPress={enter}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View
            style={[
              styles.top,
              {
                paddingTop: insets.top + 54,
                opacity: words,
                transform: [
                  {
                    translateY: words.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="notifications-outline" size={26} color="#E0BE76" />
            <Text style={styles.peace} accessibilityRole="header">
              {t("peace")}
            </Text>
            <Text style={styles.rest}>{t("rest")}</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.bottom,
              {
                paddingBottom: Math.max(insets.bottom, 18) + 26,
                opacity: words,
              },
            ]}
          >
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{t("tapDoors")}</Text>
            </View>
          </Animated.View>
        </Pressable>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.dawn, { opacity: fade }]}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DUSK },
  nativeStage: {
    position: "absolute",
    top: "33.3333%",
    left: "33.3333%",
    width: "33.3333%",
    height: "33.3333%",
    transform: [{ scale: 3 }],
  },
  shade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundImage:
      "linear-gradient(180deg, rgba(14,11,12,0.92) 0%, rgba(14,11,12,0.55) 55%, rgba(14,11,12,0) 100%)",
  },
  floorShade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundImage:
      "linear-gradient(0deg, rgba(14,11,12,0.85) 0%, rgba(14,11,12,0) 100%)",
  },
  top: { alignItems: "center", gap: 12, paddingHorizontal: 28 },
  peace: {
    fontFamily: serif,
    fontSize: 36,
    lineHeight: 42,
    color: "#F7EFE2",
    textAlign: "center",
  },
  rest: { fontSize: 16, lineHeight: 22, color: "#D8CBB6", textAlign: "center" },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  cta: {
    minHeight: 50,
    paddingHorizontal: 26,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(224,190,118,0.7)",
    backgroundColor: "rgba(21,17,18,0.55)",
    justifyContent: "center",
  },
  ctaText: { color: "#F7EFE2", fontSize: 16, fontWeight: "600" },
  dawn: { backgroundColor: IVORY },
});
