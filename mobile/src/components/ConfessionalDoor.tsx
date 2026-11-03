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
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { useFocusEffect } from "expo-router";
import { Button, colors } from "./ui";
import { copy, type Language } from "../lib/content";
import {
  createConfessionalRenderer,
  doorProgress,
  DOOR_OPEN_MS,
} from "../lib/confessional-scene";

// Keep the single static frame visible without running an idle GPU loop.
const WEB_GL_OPTIONS = {
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
};

class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function DoorFallback() {
  return (
    <View style={styles.fallback}>
      <View style={styles.fallbackLeaf}>
        <View style={styles.fallbackWindow}>
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={[styles.latticeLine, { left: i * 16 - 20 }]} />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <View
              key={i}
              style={[
                styles.latticeLine,
                { left: i * 16 - 20, transform: [{ rotate: "-35deg" }] },
              ]}
            />
          ))}
        </View>
        <View style={styles.fallbackPanel} />
        <View style={styles.fallbackHandle} />
      </View>
    </View>
  );
}

export default function ConfessionalDoor({
  language,
  opening,
  disabled,
  resume,
  onOpen,
  onEntered,
  onCancel,
  children,
}: {
  language: Language;
  opening: boolean;
  disabled: boolean;
  resume: boolean;
  onOpen: () => void;
  onEntered: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const t = (key: string) => copy(language, key);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [failed, setFailed] = useState(false);
  const renderer = useRef<ReturnType<typeof createConfessionalRenderer> | null>(
    null,
  );
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  const frame = useRef<number | null>(null);
  const layoutFrame = useRef<number | null>(null);
  const mounted = useRef(true);
  const draw = useCallback((progress: number) => {
    renderer.current?.draw(progress);
    context.current?.endFrameEXP();
  }, []);
  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  useFocusEffect(
    useCallback(
      () => () => {
        stop();
        onCancel();
      },
      [stop, onCancel],
    ),
  );
  useEffect(() => {
    mounted.current = true;
    let changed = false;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted.current && !changed) setReduced(value);
      })
      .catch(() => {});
    const preference = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        changed = true;
        setReduced(value);
      },
    );
    return () => {
      mounted.current = false;
      stop();
      if (layoutFrame.current !== null)
        cancelAnimationFrame(layoutFrame.current);
      preference.remove();
      renderer.current?.dispose();
      renderer.current = null;
      context.current = null;
    };
  }, [stop]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        stop();
        onCancel();
      }
    });
    return () => subscription.remove();
  }, [onCancel, stop]);
  // Do not leave a broken GPU surface in front of the fallback on older devices.
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setFailed(true), 2500);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    stop();
    if (!opening) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        try {
          draw(0);
        } catch {
          setFailed(true);
        }
      });
      return stop;
    }
    if (reduced || !ready || failed) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        onEntered();
      });
      return stop;
    }
    const start = performance.now();
    const tick = (now: number) => {
      if (!mounted.current) return;
      try {
        draw(doorProgress(now - start));
      } catch {
        setFailed(true);
        onEntered();
        return;
      }
      if (now - start >= DOOR_OPEN_MS) {
        frame.current = null;
        onEntered();
      } else frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return stop;
  }, [opening, reduced, ready, failed, draw, stop, onEntered]);
  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      if (!mounted.current) return;
      try {
        context.current = gl;
        renderer.current = createConfessionalRenderer(gl);
        draw(0);
        setReady(true);
      } catch {
        setFailed(true);
      }
    },
    [draw],
  );
  const enter = () =>
    resume || reduced || !ready || failed ? onEntered() : onOpen();
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(resume ? "cReturnDraft" : "cShare")}
        accessibilityHint={t("cDoorHint")}
        accessibilityState={{ disabled: disabled || opening, busy: opening }}
        disabled={disabled || opening}
        onPress={enter}
        style={styles.scene}
      >
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.art}
        >
          <View style={styles.halo} />
          <View style={styles.floorShadow} />
          {(!ready || failed) && <DoorFallback />}
          {!failed && (
            <SceneBoundary>
              <GLView
                {...(Platform.OS === "web"
                  ? {
                      webglContextAttributes: WEB_GL_OPTIONS,
                      onContextLost: () => setFailed(true),
                    }
                  : {})}
                style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}
                onContextCreate={onContextCreate}
                onLayout={() => {
                  if (!opening) {
                    if (layoutFrame.current !== null)
                      cancelAnimationFrame(layoutFrame.current);
                    layoutFrame.current = requestAnimationFrame(() => {
                      layoutFrame.current = null;
                      try {
                        draw(0);
                      } catch {
                        setFailed(true);
                      }
                    });
                  }
                }}
              />
            </SceneBoundary>
          )}
        </View>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={styles.hint}>
        {t(opening ? "cDoorOpening" : "cDoorInvitation")}
      </Text>
      <Button
        disabled={disabled || opening}
        title={t(resume ? "cReturnDraft" : "cShare")}
        onPress={enter}
      />
      {children}
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onEntered}
        style={styles.skip}
      >
        <Text style={styles.skipLabel}>{t("cDoorSkip")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, width: "100%" },
  scene: { width: "100%", maxWidth: 340, height: 270, alignSelf: "center" },
  art: { flex: 1 },
  halo: {
    position: "absolute",
    width: 210,
    height: 250,
    top: 18,
    alignSelf: "center",
    borderRadius: 120,
    backgroundColor: "#D7BD8406",
  },
  floorShadow: {
    position: "absolute",
    width: 190,
    height: 15,
    bottom: 17,
    alignSelf: "center",
    borderRadius: 100,
    backgroundColor: "#00150F55",
  },
  hint: {
    color: colors.gold,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 4,
  },
  skip: {
    minHeight: 44,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  skipLabel: {
    fontSize: 12,
    color: colors.inactive,
    textDecorationLine: "underline",
  },
  fallback: {
    width: 174,
    height: 264,
    borderTopLeftRadius: 88,
    borderTopRightRadius: 88,
    borderWidth: 12,
    borderColor: "#5F3C23",
    backgroundColor: "#281A10",
    alignSelf: "center",
    marginTop: 19,
    padding: 4,
  },
  fallbackLeaf: {
    flex: 1,
    borderTopLeftRadius: 74,
    borderTopRightRadius: 74,
    backgroundColor: "#704729",
    borderWidth: 2,
    borderColor: "#9C7545",
    padding: 16,
    gap: 20,
  },
  fallbackWindow: {
    height: 98,
    borderTopLeftRadius: 58,
    borderTopRightRadius: 58,
    backgroundColor: "#B08D50",
    borderWidth: 4,
    borderColor: "#362315",
    overflow: "hidden",
  },
  latticeLine: {
    position: "absolute",
    top: -20,
    height: 150,
    width: 3,
    backgroundColor: "#3B2716",
    transform: [{ rotate: "35deg" }],
  },
  fallbackPanel: {
    flex: 1,
    borderWidth: 4,
    borderColor: "#49301D",
    backgroundColor: "#634024",
  },
  fallbackHandle: {
    position: "absolute",
    right: 5,
    top: 140,
    width: 7,
    height: 20,
    backgroundColor: colors.gold,
    borderRadius: 3,
  },
});
