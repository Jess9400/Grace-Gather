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
  type GestureResponderEvent,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { prepareChurchTimber } from "../lib/church-texture";
import {
  createChurchRenderer,
  projectPlaces,
  placeAt,
  type ChurchPlace,
  type ChurchView,
} from "../lib/church-scene";
import { useReducedMotion } from "../lib/use-reduced-motion";
import { colors } from "./quiet-ui";

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

export type PlaceLabel = {
  key: ChurchPlace;
  label: string;
  hint: string;
  live?: boolean;
};

// The church interior on Home. The view drifts gently on its own and follows a
// finger moved across it; every place keeps an accessible, tappable label.
export default function ChurchScene({
  places,
  night,
  adventWeek,
  litVotives,
  onPlace,
  accessibilityLabel,
  paused = false,
}: {
  places: PlaceLabel[];
  night: boolean;
  adventWeek: number;
  litVotives: number;
  onPlace: (place: ChurchPlace) => void;
  accessibilityLabel: string;
  paused?: boolean;
}) {
  const reduced = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const renderer = useRef<ReturnType<typeof createChurchRenderer> | null>(null);
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  const frame = useRef<number | null>(null);
  const focused = useRef(true);
  const active = useRef(AppState.currentState === "active");
  const born = useRef(0);
  const view = useRef<ChurchView>({ dx: 0, dy: 0 });
  const touch = useRef<ChurchView | null>(null);
  const nightLevel = useRef(night ? 1 : 0);
  const props = useRef({ night, adventWeek, litVotives, reduced, paused });
  useEffect(() => {
    props.current = { night, adventWeek, litVotives, reduced, paused };
  }, [night, adventWeek, litVotives, reduced, paused]);
  const [positions] = useState(() => {
    const map = {} as Record<ChurchPlace, Animated.ValueXY>;
    (
      [
        "candles",
        "confession",
        "bible",
        "gather",
        "pews",
        "wreath",
      ] as ChurchPlace[]
    ).forEach((k) => {
      map[k] = new Animated.ValueXY({ x: -999, y: -999 });
    });
    return map;
  });
  const [highlight, setHighlight] = useState<ChurchPlace | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const sizeRef = useRef(size);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const place = useCallback(() => {
    const { width, height } = sizeRef.current;
    if (!width || !height) return;
    const projected = projectPlaces(width / height, view.current);
    (Object.keys(projected) as ChurchPlace[]).forEach((key) => {
      const p = projected[key];
      positions[key].setValue(
        p ? { x: p.x * width, y: p.y * height } : { x: -999, y: -999 },
      );
    });
  }, [positions]);

  const render = useCallback(() => {
    const { adventWeek: week, litVotives: lit, reduced: still } = props.current;
    const time = still ? 0 : (Date.now() - born.current) / 1000;
    renderer.current?.draw(time, nightLevel.current, view.current, {
      adventWeek: week,
      litVotives: lit,
    });
    context.current?.endFrameEXP();
    place();
  }, [place]);

  const loop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const tick = () => {
      frame.current = null;
      if (
        !renderer.current ||
        !focused.current ||
        !active.current ||
        props.current.paused
      )
        return;
      const { night: wantNight, reduced: still } = props.current;
      const time = (Date.now() - born.current) / 1000;
      const goal: ChurchView =
        touch.current ??
        (still
          ? { dx: 0, dy: 0 }
          : {
              dx: Math.sin(time * 0.21) * 0.55,
              dy: Math.sin(time * 0.17 + 1) * 0.35,
            });
      const ease = touch.current ? 0.18 : 0.04;
      view.current = {
        dx: view.current.dx + (goal.dx - view.current.dx) * ease,
        dy: view.current.dy + (goal.dy - view.current.dy) * ease,
      };
      nightLevel.current += ((wantNight ? 1 : 0) - nightLevel.current) * 0.08;
      try {
        render();
      } catch {
        setFailed(true);
        return;
      }
      if (
        still &&
        !touch.current &&
        Math.abs(nightLevel.current - (wantNight ? 1 : 0)) < 0.002
      )
        return;
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [render]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      loop();
      return () => {
        focused.current = false;
      };
    }, [loop]),
  );
  useEffect(() => {
    born.current = Date.now();
    const sub = AppState.addEventListener("change", (state) => {
      active.current = state === "active";
      if (active.current) loop();
    });
    return () => {
      sub.remove();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      renderer.current?.dispose();
      renderer.current = null;
      context.current = null;
    };
  }, [loop]);
  // Redraw when anything in the scene changes, including in reduced motion.
  useEffect(() => {
    if (ready) loop();
  }, [ready, night, adventWeek, litVotives, reduced, size, paused, loop]);

  const onContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      try {
        const timber = await prepareChurchTimber();
        context.current = gl;
        renderer.current = createChurchRenderer(gl, timber);
        render();
        setReady(true);
      } catch {
        setFailed(true);
      }
    },
    [render],
  );

  // Which place sits under a point in the stage, using the current view.
  const pick = (x: number, y: number) => {
    const { width, height } = sizeRef.current;
    if (!width || !height) return null;
    return placeAt(
      width / height,
      view.current,
      x / width,
      y / height,
      places.map((p) => p.key),
    );
  };
  // Touches report locationX/Y; a mouse click on the web reports offsetX/Y.
  const pointIn = (event: GestureResponderEvent): [number, number] => {
    const n = event.nativeEvent as GestureResponderEvent["nativeEvent"] & {
      offsetX?: number;
      offsetY?: number;
    };
    return [n.locationX ?? n.offsetX ?? NaN, n.locationY ?? n.offsetY ?? NaN];
  };
  const follow = (event: GestureResponderEvent) => {
    const { width, height } = sizeRef.current;
    if (!width) return;
    const { locationX, locationY } = event.nativeEvent;
    if (event.type === "touchstart" || !start.current) {
      start.current = {
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
      };
      dragged.current = false;
    } else if (
      Math.hypot(
        event.nativeEvent.pageX - start.current.x,
        event.nativeEvent.pageY - start.current.y,
      ) > 12
    ) {
      dragged.current = true;
      if (highlight) setHighlight(null);
    }
    touch.current = {
      dx: Math.max(-1, Math.min(1, (locationX / width) * 2 - 1)),
      dy: Math.max(-1, Math.min(1, (locationY / height) * 2 - 1)),
    };
    if (frame.current === null) loop();
  };
  const release = () => {
    touch.current = null;
    start.current = null;
    if (frame.current === null) loop();
  };

  if (failed) return null;
  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      style={styles.stage}
      onLayout={(e) =>
        setSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
      onTouchStart={follow}
      onTouchMove={follow}
      onTouchEnd={release}
      onTouchCancel={release}
      {...(Platform.OS === "web"
        ? {
            onPointerMove: (e: {
              nativeEvent: { offsetX: number; offsetY: number };
            }) => {
              const { width, height } = sizeRef.current;
              if (!width) return;
              const hovered = pick(
                e.nativeEvent.offsetX,
                e.nativeEvent.offsetY,
              );
              if (hovered !== highlight) setHighlight(hovered);
              touch.current = {
                dx: Math.max(
                  -1,
                  Math.min(1, (e.nativeEvent.offsetX / width) * 2 - 1),
                ),
                dy: Math.max(
                  -1,
                  Math.min(1, (e.nativeEvent.offsetY / height) * 2 - 1),
                ),
              };
              if (frame.current === null) loop();
            },
            onPointerLeave: () => {
              setHighlight(null);
              release();
            },
          }
        : {})}
    >
      <SceneBoundary onFailure={() => setFailed(true)}>
        <GLView
          {...(Platform.OS === "web"
            ? {
                webglContextAttributes: WEB_GL_OPTIONS,
                onContextLost: () => setFailed(true),
              }
            : {})}
          style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}
          onContextCreate={onContextCreate}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
      </SceneBoundary>
      {ready && (
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          style={StyleSheet.absoluteFill}
          onPressIn={(e) => {
            if (Platform.OS !== "web") setHighlight(pick(...pointIn(e)));
          }}
          onPressOut={() => {
            if (Platform.OS !== "web") setHighlight(null);
          }}
          onPress={(e) => {
            if (dragged.current) return;
            const place = pick(...pointIn(e));
            if (place) onPlace(place);
          }}
        />
      )}
      {ready &&
        places.map((p) => (
          <Animated.View
            key={p.key}
            pointerEvents="box-none"
            style={[
              styles.anchor,
              { transform: positions[p.key].getTranslateTransform() },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={p.label}
              accessibilityHint={p.hint}
              hitSlop={10}
              onPress={() => onPlace(p.key)}
              style={({ pressed }) => [
                styles.chip,
                highlight === p.key && styles.chipOn,
                pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
              ]}
            >
              {p.live && <View style={styles.live} />}
              <Text
                style={[
                  styles.chipText,
                  highlight === p.key && { color: colors.white },
                ]}
                numberOfLines={1}
              >
                {p.label}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    aspectRatio: 0.82,
    maxHeight: 560,
    overflow: "hidden",
    borderRadius: 26,
    backgroundColor: "#E9DFCF",
  },
  anchor: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: "rgba(255,252,243,0.94)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(48,44,40,0.12)",
    boxShadow: "0 6px 16px rgba(48,44,40,0.22)",
    transform: [{ translateY: -4 }],
  },
  chipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
    transform: [{ translateY: -4 }, { scale: 1.06 }],
  },
  chipText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  live: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#B4532F" },
});
