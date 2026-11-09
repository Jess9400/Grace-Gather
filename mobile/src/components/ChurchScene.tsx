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
  View,
  type GestureResponderEvent,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { prepareChurchTimber } from "../lib/church-texture";
import { contextLost, releaseContext } from "../lib/gl-recovery";
import {
  createChurchRenderer,
  projectFocus,
  projectPlaces,
  placeAt,
  type ChurchPlace,
  type ChurchView,
} from "../lib/church-scene";
import { useReducedMotion } from "../lib/use-reduced-motion";
import { setChurchSnapshot } from "../lib/church-room";
import { Ionicons } from "@expo/vector-icons";

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
const TOUR_FADE_MS = 400;
const TOUR_HOLD_MS = 2800;

export type PlaceLabel = {
  key: ChurchPlace;
  label: string;
  hint: string;
  live?: boolean;
};

// The church interior on Home. The view drifts gently on its own and follows a
// finger moved across it. Tapping an object opens its place. Labels stay hidden
// (but remain the accessible controls); a short tour shows them one by one,
// with a pointer during exploration. Normal browsing has no floating text.
export default function ChurchScene({
  places,
  night,
  adventWeek,
  litVotives,
  onPlace,
  accessibilityLabel,
  paused = false,
  fullScreen = false,
  protestant = false,
  candlesAllowed = !protestant,
  orthodox = false,
  tour = false,
  labelsEnabled = true,
  onTourDone,
  onTourPlace,
  onFailure,
}: {
  places: PlaceLabel[];
  night: boolean;
  adventWeek: number;
  litVotives: number;
  // `point` is where the place sits in the scene, for the walk-in.
  onPlace: (place: ChurchPlace, point?: { x: number; y: number }) => void;
  accessibilityLabel: string;
  paused?: boolean;
  fullScreen?: boolean;
  protestant?: boolean;
  candlesAllowed?: boolean;
  orthodox?: boolean;
  tour?: boolean;
  labelsEnabled?: boolean;
  onTourDone?: () => void;
  onTourPlace?: (place: ChurchPlace | null) => void;
  onFailure?: () => void;
}) {
  const reduced = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const renderer = useRef<ReturnType<typeof createChurchRenderer> | null>(null);
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  const frame = useRef<number | null>(null);
  // A lost WebGL context is rebuilt with a fresh view instead of giving up.
  const [glKey, setGlKey] = useState(0);
  const recoveries = useRef(0);
  const createdAt = useRef(0);
  const recover = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    renderer.current = null;
    context.current = null;
    setReady(false);
    // A context that lived a while earns a fresh set of retries.
    if (Date.now() - createdAt.current > 10000) recoveries.current = 0;
    if (recoveries.current < 4) {
      recoveries.current++;
      setGlKey((k) => k + 1);
    } else setFailed(true);
  }, []);
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
    candlesAllowed,
    orthodox,
  });
  useEffect(() => {
    props.current = {
      night,
      adventWeek,
      litVotives,
      reduced,
      paused,
      protestant,
      candlesAllowed,
      orthodox,
    };
  }, [
    night,
    adventWeek,
    litVotives,
    reduced,
    paused,
    protestant,
    candlesAllowed,
    orthodox,
  ]);
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
      candlesAllowed: showCandles,
      orthodox: eastern,
    } = props.current;
    const time = still ? 0 : (Date.now() - born.current) / 1000;
    renderer.current?.draw(time, nightLevel.current, view.current, {
      adventWeek: week,
      litVotives: lit,
      protestant: plain,
      candlesAllowed: showCandles,
      orthodox: eastern,
    });
    context.current?.endFrameEXP();
    place();
  }, [place]);

  // Where every place sits on the stage, in points.
  const placePoints = useCallback(() => {
    const { width, height } = sizeRef.current;
    if (!width || !height) return {};
    const projected = projectFocus(width / height, view.current);
    const points: Partial<Record<ChurchPlace, { x: number; y: number }>> = {};
    (Object.keys(projected) as ChurchPlace[]).forEach((key) => {
      const p = projected[key];
      if (p) points[key] = { x: p.x * width, y: p.y * height };
    });
    return points;
  }, []);
  // Keep a picture of the church as it is now, so the screens it opens can
  // show their part of it across the top.
  const capture = useCallback(async () => {
    const gl = context.current;
    const { width, height } = sizeRef.current;
    if (!gl || !width || !height || !renderer.current) return;
    // Measure now: leaving Home can resize the stage before the picture is
    // ready, and the points must match the picture.
    const points = placePoints();
    try {
      const shot = await GLView.takeSnapshotAsync(gl, {
        format: "jpeg",
        compress: 0.86,
      });
      const raw = shot.uri as unknown;
      const uri =
        typeof raw === "string"
          ? raw
          : typeof Blob !== "undefined" && raw instanceof Blob
            ? URL.createObjectURL(raw)
            : null;
      if (uri) setChurchSnapshot({ uri, width, height, points });
    } catch {
      // The screens keep their usual header without a picture.
    }
  }, [placePoints]);

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
      // Keep the seated viewpoint fixed; touch and hover still select places.
      view.current = { dx: 0, dy: 0 };
      nightLevel.current += ((wantNight ? 1 : 0) - nightLevel.current) * 0.08;
      try {
        render();
      } catch {
        if (contextLost(context.current)) recover();
        else setFailed(true);
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
  }, [render, recover]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (contextLost(context.current)) recover();
      else loop();
      return () => {
        focused.current = false;
      };
    }, [loop, recover]),
  );
  useEffect(() => {
    born.current = Date.now();
    const sub = AppState.addEventListener("change", (state) => {
      active.current = state === "active";
      if (!active.current) return;
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
    candlesAllowed,
    orthodox,
    loop,
  ]);

  useEffect(() => {
    if (failed) onFailure?.();
  }, [failed, onFailure]);

  // The tour: each readable label fades in briefly, rests for a moment,
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
        timer = setTimeout(step, TOUR_FADE_MS + 80);
      }, TOUR_FADE_MS + TOUR_HOLD_MS);
    };
    timer = setTimeout(step, 150);
    stopTour.current = finish;
    return () => {
      cancelled = true;
      stopTour.current = null;
      if (timer) clearTimeout(timer);
      setTouring(null);
    };
  }, [ready, tour, keys, onTourDone]);

  useEffect(() => {
    if (touring) onTourPlace?.(touring);
  }, [touring, onTourPlace]);

  const visible = labelsEnabled && tour ? touring : null;
  const touringLast = useRef<ChurchPlace | null>(null);
  useEffect(() => {
    if (touring) touringLast.current = touring;
  }, [touring]);
  useEffect(() => {
    (Object.keys(shown) as ChurchPlace[]).forEach((key) =>
      Animated.timing(shown[key], {
        toValue: key === visible ? 1 : 0,
        duration: reduced
          ? 0
          : touring || key === touringLast.current
            ? TOUR_FADE_MS
            : key === visible
              ? 220
              : 300,
        useNativeDriver: true,
      }).start(),
    );
  }, [visible, touring, shown, reduced]);

  const onContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      try {
        const timber = await prepareChurchTimber();
        context.current = gl;
        renderer.current = createChurchRenderer(gl, timber);
        createdAt.current = Date.now();
        render();
        setReady(true);
      } catch {
        if (contextLost(gl)) recover();
        else setFailed(true);
      }
    },
    [render, recover],
  );
  // Refresh the picture once the church settles after anything about it
  // changes (evening, tradition, candles, Advent), so rooms reached from the
  // tab bar show it as it is now.
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => void capture(), 1600);
    return () => clearTimeout(timer);
  }, [
    ready,
    capture,
    night,
    adventWeek,
    litVotives,
    protestant,
    candlesAllowed,
    orthodox,
  ]);

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
      style={fullScreen ? styles.fullScreen : styles.stage}
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
                onContextLost: recover,
              }
            : {})}
          key={glKey}
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
            if (place) {
              void capture();
              onPlace(place, placePoints()[place]);
            }
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
              {tour ? (
                <View
                  style={styles.tourPointer}
                  pointerEvents="none"
                  accessible={false}
                >
                  <Ionicons name="arrow-down" size={38} color="#FFFCF3" />
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={p.label}
                  accessibilityHint={p.hint}
                  hitSlop={10}
                  onPress={() => {
                    void capture();
                    onPlace(p.key, placePoints()[p.key]);
                  }}
                  style={({ pressed }) => [
                    styles.chip,
                    pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                  ]}
                ></Pressable>
              )}
            </Animated.View>
          </Animated.View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    backgroundColor: "#211B16",
  },
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
  // The arrow tip sits just above the destination; no bounce or pulse.
  tourPointer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#302C28",
    borderWidth: 2,
    borderColor: "#FFFCF3",
  },
  // Invisible, named targets retain keyboard/screen-reader access to each place.
  chip: { width: 44, height: 44 },
  label: { alignItems: "center" },
});
