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
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { confessionColors as room } from "../lib/confession-theme";
import { prepareWalnutTexture } from "../lib/confessional-texture";
import { copy, type Language } from "../lib/content";
import {
  createConfessionalRenderer,
  entranceFrame,
  ENTRANCE_MS,
} from "../lib/confessional-scene";

const WEB_GL_OPTIONS = {
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
};

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

// Mounted only after Share a confession. The writing room is already underneath
// this full-screen layer, so entering ends with a continuous reveal of the form.
export default function ConfessionalDoor({
  language,
  onEntered,
  onCancel,
}: {
  language: Language;
  onEntered: () => void;
  onCancel: () => void;
}) {
  const t = (key: string) => copy(language, key);
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));
  const [sceneOpacity] = useState(() => new Animated.Value(0));
  const renderer = useRef<ReturnType<typeof createConfessionalRenderer> | null>(
    null,
  );
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  const frame = useRef<number | null>(null);
  const currentFrame = useRef({ open: 0, approach: 0 });
  const mounted = useRef(true);
  const finished = useRef(false);
  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    opacity.stopAnimation();
    sceneOpacity.stopAnimation();
  }, [opacity, sceneOpacity]);
  const finish = useCallback(() => {
    if (!mounted.current || finished.current) return;
    finished.current = true;
    stop();
    onEntered();
  }, [onEntered, stop]);
  const cancel = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    stop();
    onCancel();
  }, [onCancel, stop]);
  const draw = useCallback((open: number, approach: number) => {
    currentFrame.current = { open, approach };
    renderer.current?.draw(open, approach);
    context.current?.endFrameEXP();
  }, []);
  const fail = useCallback(() => setFailed(true), []);

  useEffect(() => {
    mounted.current = true;
    let changed = false;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted.current && !changed) setReduced(value);
      })
      .catch(() => {
        if (mounted.current) setReduced(true);
      });
    const preference = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        changed = true;
        setReduced(value);
      },
    );
    const appState = AppState.addEventListener("change", (state) => {
      if (state !== "active") cancel();
    });
    return () => {
      mounted.current = false;
      stop();
      preference.remove();
      appState.remove();
      renderer.current?.dispose();
      renderer.current = null;
      context.current = null;
    };
  }, [cancel, stop]);

  // A device with unavailable graphics must always be able to reach the form.
  useEffect(() => {
    const timer = setTimeout(finish, 5000);
    return () => clearTimeout(timer);
  }, [finish]);
  useEffect(() => {
    if (reduced === true || failed) {
      frame.current = requestAnimationFrame(finish);
      return stop;
    }
    if (!ready || reduced === null) return;
    const start = performance.now();
    const tick = (now: number) => {
      if (!mounted.current || finished.current) return;
      const elapsed = now - start;
      const next = entranceFrame(elapsed);
      try {
        draw(next.open, next.approach);
        sceneOpacity.setValue(next.sceneOpacity);
        opacity.setValue(next.overlayOpacity);
      } catch {
        finish();
        return;
      }
      if (elapsed >= ENTRANCE_MS) {
        frame.current = null;
        finish();
      } else frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return stop;
  }, [draw, failed, finish, opacity, sceneOpacity, ready, reduced, stop]);
  const onContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      if (!mounted.current || finished.current) return;
      try {
        const texture = await prepareWalnutTexture();
        if (!mounted.current || finished.current) return;
        context.current = gl;
        renderer.current = createConfessionalRenderer(gl, texture);
        draw(0, 0);
        setReady(true);
      } catch {
        fail();
      }
    },
    [draw, fail],
  );

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={cancel}
    >
      <Animated.View
        style={[styles.overlay, { opacity }]}
        accessibilityViewIsModal
      >
        <View style={styles.stage}>
          <Animated.View
            pointerEvents="none"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[StyleSheet.absoluteFill, { opacity: sceneOpacity }]}
          >
            {!failed && (
              <SceneBoundary onFailure={fail}>
                <GLView
                  {...(Platform.OS === "web"
                    ? {
                        webglContextAttributes: WEB_GL_OPTIONS,
                        onContextLost: fail,
                      }
                    : {})}
                  style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}
                  onContextCreate={onContextCreate}
                  onLayout={() => {
                    // Keep the current door position when the viewport changes.
                    if (renderer.current) {
                      try {
                        draw(
                          currentFrame.current.open,
                          currentFrame.current.approach,
                        );
                      } catch {
                        fail();
                      }
                    }
                  }}
                />
              </SceneBoundary>
            )}
          </Animated.View>
          <View style={[styles.top, { paddingTop: Math.max(insets.top, 18) }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("cBack")}
              onPress={cancel}
              style={styles.back}
            >
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
            <Text style={styles.eyebrow}>{t("confession")}</Text>
            <View style={styles.balance} />
          </View>
          <View
            style={[
              styles.bottom,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <Text accessibilityLiveRegion="polite" style={styles.hint}>
              {t("cDoorInvitation")}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={finish}
              style={styles.skip}
            >
              <Text style={styles.skipLabel}>{t("cDoorSkip")}</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: room.background },
  stage: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    overflow: "hidden",
  },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${room.background}E6`,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: { fontSize: 30, lineHeight: 34, color: room.ink },
  balance: { width: 44 },
  eyebrow: {
    color: room.accent,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: "uppercase",
    backgroundColor: `${room.background}E6`,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 14,
    backgroundColor: `${room.background}E6`,
  },
  hint: {
    color: room.ink,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  skip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 24 },
  skipLabel: {
    color: room.accent,
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
