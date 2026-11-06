import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { createCandleRenderer } from "../lib/candle-scene";
import { useReducedMotion } from "../lib/use-reduced-motion";

const WEB_GL_OPTIONS = {
  alpha: false,
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

// A candle in a stone alcove. When `lit` turns on, the flame catches and grows.
export default function CandleView({
  lit,
  hint,
  label,
  onPress,
}: {
  lit: boolean;
  hint?: string;
  label: string;
  onPress?: () => void;
}) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const renderer = useRef<ReturnType<typeof createCandleRenderer> | null>(null);
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  const frame = useRef<number | null>(null);
  const born = useRef(0);
  const level = useRef(lit ? 1 : 0);
  const want = useRef({ lit, reduced });
  useEffect(() => {
    want.current = { lit, reduced };
  }, [lit, reduced]);

  const loop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const tick = () => {
      frame.current = null;
      if (!renderer.current) return;
      const goal = want.current.lit ? 1 : 0;
      level.current = want.current.reduced
        ? goal
        : level.current + (goal - level.current) * 0.06;
      const time = want.current.reduced
        ? 0
        : (Date.now() - born.current) / 1000;
      try {
        renderer.current.draw(level.current, time);
        context.current?.endFrameEXP();
      } catch {
        setFailed(true);
        return;
      }
      const settled = Math.abs(goal - level.current) < 0.002;
      if (settled && (goal === 0 || want.current.reduced)) return;
      if (AppState.currentState === "active")
        frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (ready) loop();
  }, [ready, lit, reduced, loop]);
  useEffect(() => {
    born.current = Date.now();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") loop();
    });
    return () => {
      sub.remove();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, [loop]);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "image"}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={styles.frame}
    >
      {!failed ? (
        <SceneBoundary onFailure={() => setFailed(true)}>
          <GLView
            {...(Platform.OS === "web"
              ? {
                  webglContextAttributes: WEB_GL_OPTIONS,
                  onContextLost: () => setFailed(true),
                }
              : {})}
            style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}
            onContextCreate={(gl: ExpoWebGLRenderingContext) => {
              try {
                context.current = gl;
                renderer.current = createCandleRenderer(gl);
                renderer.current.draw(level.current, 0);
                gl.endFrameEXP();
                setReady(true);
              } catch {
                setFailed(true);
              }
            }}
          />
        </SceneBoundary>
      ) : (
        <View style={styles.fallback}>
          <View style={styles.wax} />
          {lit && <View style={styles.flame} />}
        </View>
      )}
      {hint ? (
        <View pointerEvents="none" style={styles.hintWrap}>
          <Text style={styles.hint}>{hint}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 0.92,
    maxHeight: 460,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#211A16",
  },
  hintWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: "center",
  },
  hint: {
    color: "#F7EFE2",
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(33,26,22,0.72)",
    borderWidth: 1,
    borderColor: "rgba(224,190,118,0.6)",
  },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  wax: { width: 54, height: 150, borderRadius: 6, backgroundColor: "#F2EADB" },
  flame: {
    position: "absolute",
    top: "22%",
    width: 16,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFC35A",
  },
});
