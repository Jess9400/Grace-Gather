import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { createCandleRenderer } from "../lib/candle-scene";
import { contextLost, releaseContext } from "../lib/gl-recovery";
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
  const [glKey, setGlKey] = useState(0);
  const [glow] = useState(() => new Animated.Value(0.85));
  const recoveries = useRef(0);
  // A lost WebGL context gets a fresh view (a few times) instead of failing.
  const recover = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    renderer.current = null;
    context.current = null;
    setReady(false);
    if (recoveries.current < 4) {
      recoveries.current++;
      setGlKey((k) => k + 1);
    } else setFailed(true);
  }, []);
  const born = useRef(0);
  const level = useRef(lit ? 1 : 0);
  const want = useRef({ lit, reduced });
  useEffect(() => {
    want.current = { lit, reduced };
  }, [lit, reduced]);

  // Keep a visible candle underneath while GL starts, and retain it if a
  // device never creates its context instead of leaving an empty dark panel.
  useEffect(() => {
    if (ready || failed) return;
    const timeout = setTimeout(() => setFailed(true), 6000);
    return () => clearTimeout(timeout);
  }, [failed, glKey, ready]);
  useEffect(() => {
    if (!lit || reduced) return;
    const flicker = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 720, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.72, duration: 580, useNativeDriver: true }),
    ]));
    flicker.start();
    return () => flicker.stop();
  }, [glow, lit, reduced]);

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
        if (contextLost(context.current)) recover();
        else setFailed(true);
        return;
      }
      const settled = Math.abs(goal - level.current) < 0.002;
      if (settled && (goal === 0 || want.current.reduced)) return;
      if (AppState.currentState === "active")
        frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [recover]);

  useEffect(() => {
    if (ready) loop();
  }, [ready, lit, reduced, loop]);
  useEffect(() => {
    born.current = Date.now();
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (contextLost(context.current)) recover();
      else loop();
    });
    return () => {
      sub.remove();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      renderer.current?.dispose();
      renderer.current = null;
      releaseContext(context.current);
      context.current = null;
    };
  }, [loop, recover]);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "image"}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={styles.frame}
    >
      <View pointerEvents="none" style={styles.fallback}>
        <View style={styles.alcove} />
        <View style={styles.ledge} />
        <View style={styles.dish} />
        <View style={styles.wax} />
        <View style={styles.wick} />
        {lit && <Animated.View style={[styles.flameGlow, { opacity: glow }]} />}
        {lit && <Animated.View style={[styles.flame, { opacity: glow }]}><View style={styles.flameCore} /></Animated.View>}
      </View>
      {!failed ? (
        <SceneBoundary onFailure={() => setFailed(true)}>
          <GLView
            {...(Platform.OS === "web"
              ? {
                  webglContextAttributes: WEB_GL_OPTIONS,
                  onContextLost: recover,
                }
              : {})}
            key={glKey}
            style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}
            onContextCreate={(gl: ExpoWebGLRenderingContext) => {
              try {
                if (!gl.drawingBufferWidth || !gl.drawingBufferHeight)
                  throw new Error("Candle drawing surface is unavailable");
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
      ) : null}
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
  fallback: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#332820", overflow: "hidden" },
  alcove: { position: "absolute", top: "8%", bottom: "12%", width: "68%", borderTopLeftRadius: 160, borderTopRightRadius: 160, backgroundColor: "#574435", borderWidth: 12, borderColor: "#6A5542" },
  ledge: { position: "absolute", top: "73%", width: "100%", height: "9%", backgroundColor: "#766049", borderTopWidth: 5, borderTopColor: "#92775A" },
  dish: { position: "absolute", top: "70%", width: 110, height: 16, borderRadius: 55, backgroundColor: "#AC824B", borderBottomWidth: 5, borderBottomColor: "#6D4B2C" },
  wax: { position: "absolute", top: "43%", height: "29%", width: 56, borderRadius: 8, backgroundColor: "#EEDDC0", borderLeftWidth: 6, borderLeftColor: "#FFF2D8", borderRightWidth: 7, borderRightColor: "#C7AD87" },
  wick: { position: "absolute", top: "40%", width: 3, height: "4%", borderRadius: 2, backgroundColor: "#2E231A" },
  flameGlow: { position: "absolute", top: "25%", width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,173,58,0.18)" },
  flame: {
    position: "absolute",
    top: "32%",
    width: 16,
    height: "10%",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: "#FFC35A",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  flameCore: { width: 7, height: "55%", borderRadius: 6, backgroundColor: "#FFF4C4" },
});
