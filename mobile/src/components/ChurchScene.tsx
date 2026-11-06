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

const TOUR_ORDER: ChurchPlace[] = [
  "confession",
  "gather",
  "bible",
  "candles",
  "pews",
  "wreath",
];
const TOUR_FADE_MS = 700;
const TOUR_HOLD_MS = 2500;

export type PlaceLabel = {
  key: ChurchPlace;
  label: string;
  hint: string;
  live?: boolean;
};

// The church interior on Home. The view drifts gently on its own and follows a
// finger moved across it. Tapping an object opens its place. Labels stay hidden
// (but remain the accessible controls); a short tour shows them one by one,
// and a label appears while its object is touched or hovered.
export default function ChurchScene({
  places,
  night,
  adventWeek,
  litVotives,
  onPlace,
  accessibilityLabel,
  paused = false,
  protestant = false,
  tour = false,
  onTourDone,
  onFailure,
}: {
  places: PlaceLabel[];
  night: boolean;
  adventWeek: number;
  litVotives: number;
  onPlace: (place: ChurchPlace) => void;
  accessibilityLabel: string;
  paused?: boolean;
  protestant?: boolean;
  tour?: boolean;
  onTourDone?: () => void;
  onFailure?: () => void;
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
  const props = useRef({
    night,
    adventWeek,
    litVotives,
    reduced,
    paused,
    protestant,
  });
  useEffect(() => {
    props.current = {
      night,
      adventWeek,
      litVotives,
      reduced,
      paused,
      protestant,
    };
  }, [night, adventWeek, litVotives, reduced, paused, protestant]);
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
  const [shown] = useState(() => {
    const map = {} as Record<ChurchPlace, Animated.Value>;
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
      map[k] = new Animated.Value(0);
    });
    return map;
  });
  const [touring, setTouring] = useState<ChurchPlace | null>(null);
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
    const projected = projectPlaces(
      width / height,
      view.current,
      props.current.protestant,
    );
    (Object.keys(projected) as ChurchPlace[]).forEach((key) => {
      const p = projected[key];
      positions[key].setValue(
        p ? { x: p.x * width, y: p.y * height } : { x: -999, y: -999 },
      );
    });
  }, [positions]);

  const render = useCallback(() => {
    const {
      adventWeek: week,
      litVotives: lit,
      reduced: still,
      protestant: plain,
    } = props.current;
    const time = still ? 0 : (Date.now() - born.current) / 1000;
    renderer.current?.draw(time, nightLevel.current, view.current, {
      adventWeek: week,
      litVotives: lit,
      protestant: plain,
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
  }, [
    ready,
    night,
    adventWeek,
    litVotives,
    reduced,
    size,
    paused,
    protestant,
    loop,
  ]);

  useEffect(() => {
    if (failed) onFailure?.();
  }, [failed, onFailure]);

  // The tour: each label fades in slowly with its arrow, rests for a moment,
  // fades out, and the next one follows. Touching the church ends it.
  const keys = places.map((p) => p.key).join(",");
  const stopTour = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!ready || !tour) return;
    const order = (keys.split(",") as ChurchPlace[]).sort(
      (a, b) => TOUR_ORDER.indexOf(a) - TOUR_ORDER.indexOf(b),
    );
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let i = 0;
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      if (timer) clearTimeout(timer);
      setTouring(null);
      onTourDone?.();
    };
    const step = () => {
      if (cancelled) return;
      if (i >= order.length) return finish();
      setTouring(order[i]);
      i++;
      timer = setTimeout(() => {
        setTouring(null);
        timer = setTimeout(step, TOUR_FADE_MS + 250);
      }, TOUR_FADE_MS + TOUR_HOLD_MS);
    };
    timer = setTimeout(step, 700);
    stopTour.current = finish;
    return () => {
      cancelled = true;
      stopTour.current = null;
      if (timer) clearTimeout(timer);
      setTouring(null);
    };
  }, [ready, tour, keys, onTourDone]);

  const visible = touring ?? highlight;
  const touringLast = useRef<ChurchPlace | null>(null);
  useEffect(() => {
    if (touring) touringLast.current = touring;
  }, [touring]);
  useEffect(() => {
    (Object.keys(shown) as ChurchPlace[]).forEach((key) =>
      Animated.timing(shown[key], {
        toValue: key === visible ? 1 : 0,
        duration:
          touring || key === touringLast.current
            ? TOUR_FADE_MS
            : key === visible
              ? 220
              : 300,
        useNativeDriver: true,
      }).start(),
    );
  }, [visible, touring, shown]);

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
    if (event.type === "touchstart") stopTour.current?.();
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
            stopTour.current?.();
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
            <Animated.View
              pointerEvents="box-none"
              style={[
                styles.label,
                {
                  opacity: shown[p.key],
                  transform: [
                    {
                      translateY: shown[p.key].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-14, -24],
                      }),
                    },
                  ],
                },
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
                  pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                ]}
              >
                {p.live && <View style={styles.live} />}
                <Text style={styles.chipText} numberOfLines={1}>
                  {p.label}
                </Text>
              </Pressable>
              <View style={styles.arrow} />
            </Animated.View>
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
    backgroundColor: colors.ink,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,252,243,0.25)",
    boxShadow: "0 6px 16px rgba(48,44,40,0.22)",
  },
  label: { alignItems: "center" },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.ink,
    marginTop: 2,
  },
  chipText: { color: colors.white, fontSize: 13, fontWeight: "600" },
  live: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#B4532F" },
});
