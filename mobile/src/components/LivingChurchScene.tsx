import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { Asset } from "expo-asset";
import { artworkBox, artworkFrame, artworkPlaceAt, artworkPoints, artworkStage, type ChurchArt } from "../lib/church-art";
import type { ChurchPlace } from "../lib/church-scene";
import { setChurchSnapshot } from "../lib/church-room";
import { useReducedMotion } from "../lib/use-reduced-motion";
import type { PlaceLabel } from "./ChurchScene";

const ART = {
  catholic: require("../../assets/church/scenes/catholic.jpg"),
  orthodox: require("../../assets/church/scenes/orthodox.jpg"),
  protestant: require("../../assets/church/scenes/protestant.jpg"),
};
const TOUR_ORDER: ChurchPlace[] = ["pray", "confession", "gather", "bible", "candles", "pews", "wreath"];
const FLAMES: Record<ChurchArt, { x: number; y: number; size: number }[]> = {
  catholic: [
    { x: 0.4, y: 0.405, size: 7 }, { x: 0.6, y: 0.405, size: 7 },
    { x: 0.06, y: 0.475, size: 4 }, { x: 0.101, y: 0.475, size: 4 },
    { x: 0.137, y: 0.475, size: 4 }, { x: 0.174, y: 0.475, size: 4 },
  ],
  orthodox: [
    { x: 0.368, y: 0.27, size: 4 }, { x: 0.63, y: 0.27, size: 4 },
    { x: 0.055, y: 0.527, size: 5 }, { x: 0.101, y: 0.528, size: 5 },
    { x: 0.146, y: 0.54, size: 4 }, { x: 0.191, y: 0.55, size: 4 },
  ],
  protestant: [],
};

/** The approved sanctuary artwork, with the existing places and tour on top. */
export default function LivingChurchScene({
  art, places, night, paused, tour, labelsEnabled, labelsAlways, onPlace,
  onTourDone, onTourPlace, onFailure, accessibilityLabel,
}: {
  art: ChurchArt;
  places: PlaceLabel[];
  night: boolean;
  paused: boolean;
  tour: boolean;
  labelsEnabled: boolean;
  labelsAlways: boolean;
  onPlace: (place: ChurchPlace, point?: { x: number; y: number }) => void;
  onTourDone: () => void;
  onTourPlace: (place: ChurchPlace | null) => void;
  onFailure: () => void;
  accessibilityLabel: string;
}) {
  const reduced = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [readyArt, setReadyArt] = useState<ChurchArt | null>(null);
  const [focused, setFocused] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [touring, setTouring] = useState<ChurchPlace | null>(null);
  const [glow] = useState(() => new Animated.Value(0.5));
  const [flame] = useState(() => new Animated.Value(0.7));
  const [shown] = useState(() => new Animated.Value(0));
  const tourTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ready = readyArt === art;
  const points = artworkPoints(art, size.width, size.height);
  const frame = artworkFrame(size.width, size.height);
  const stage = artworkStage(size.width, size.height);
  const wide = stage.width < size.width;
  const keys = places.map((place) => place.key).join(",");

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (reduced || paused || !focused || !active) {
      glow.setValue(0.5);
      flame.setValue(0.7);
      return;
    }
    const flicker = Animated.loop(Animated.sequence([
      Animated.timing(flame, { toValue: 0.95, duration: 720, useNativeDriver: true }),
      Animated.timing(flame, { toValue: 0.45, duration: 930, useNativeDriver: true }),
    ]));
    const breathing = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 0.72, duration: 2800, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.3, duration: 3300, useNativeDriver: true }),
    ]));
    flicker.start();
    breathing.start();
    return () => { flicker.stop(); breathing.stop(); };
  }, [active, flame, focused, glow, paused, reduced]);

  // The room strips and walk-in transitions use this same covered image.
  useEffect(() => {
    if (!ready || !size.width || !size.height) return;
    try {
      const asset = Asset.fromModule(ART[art]);
      const uri = asset.localUri ?? asset.uri;
      if (uri) setChurchSnapshot({ uri, width: size.width, height: size.height, points: artworkPoints(art, size.width, size.height), artStage: artworkStage(size.width, size.height), night });
    } catch {
      // The church remains usable even if an optional room strip is unavailable.
    }
  }, [art, night, ready, size]);

  useEffect(() => {
    if (!ready || !tour) return;
    const order = (keys.split(",") as ChurchPlace[]).filter(Boolean).sort((a, b) => TOUR_ORDER.indexOf(a) - TOUR_ORDER.indexOf(b));
    let index = 0;
    let cancelled = false;
    const step = () => {
      if (cancelled) return;
      if (index >= order.length) { setTouring(null); onTourDone(); return; }
      const next = order[index++];
      setTouring(next);
      onTourPlace(next);
      shown.setValue(0);
      Animated.sequence([
        Animated.timing(shown, { toValue: 1, duration: reduced ? 0 : 400, useNativeDriver: true }),
        Animated.delay(2800),
        Animated.timing(shown, { toValue: 0, duration: reduced ? 0 : 400, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished && !cancelled) tourTimer.current = setTimeout(step, 80); });
    };
    tourTimer.current = setTimeout(step, 150);
    return () => { cancelled = true; if (tourTimer.current) clearTimeout(tourTimer.current); shown.stopAnimation(); setTouring(null); };
  }, [keys, onTourDone, onTourPlace, ready, reduced, shown, tour]);

  const openAt = (x: number, y: number) => {
    const place = artworkPlaceAt(art, size.width, size.height, x, y, places.map((p) => p.key));
    if (place) onPlace(place, points[place]);
  };
  const current = touring ? points[touring] : undefined;
  const named = labelsAlways && labelsEnabled && !tour;
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.scene}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {wide && <Image source={ART[art]} resizeMode="cover" blurRadius={24} style={styles.artwork} accessible={false} />}
      {wide && <View pointerEvents="none" style={styles.wideShade} />}
      <View style={[styles.artStage, { left: stage.left, width: stage.width }]} pointerEvents="none">
        <Image key={art} source={ART[art]} resizeMode="cover" style={styles.artwork} accessible={false}
          onLoad={() => setReadyArt(art)} onError={onFailure} />
        {wide && <><View style={[styles.feather, styles.featherLeft]} /><View style={[styles.feather, styles.featherRight]} /></>}
      </View>
      {night && <View pointerEvents="none" style={styles.evening} />}
      {ready && size.width > 0 && (
        <>
          <Animated.View pointerEvents="none" style={[styles.ambientLight, {
            opacity: glow,
            left: frame.left + frame.width * (art === "protestant" ? 0.33 : 0.27),
            top: frame.top + frame.height * (art === "orthodox" ? 0.22 : 0.22),
            width: frame.width * 0.44, height: frame.height * 0.34,
          }]} />
          {FLAMES[art].map((item, index) => (
            <Animated.View key={index} pointerEvents="none" style={[styles.flame, {
              opacity: flame, left: frame.left + frame.width * item.x - item.size / 2,
              top: frame.top + frame.height * item.y - item.size / 2,
              width: item.size, height: item.size * 1.35, borderRadius: item.size / 2,
            }]} />
          ))}
          <Pressable accessible={false} importantForAccessibility="no" style={StyleSheet.absoluteFill}
            onPress={(event) => openAt(event.nativeEvent.locationX, event.nativeEvent.locationY)} />
          {places.map((place) => {
            const box = artworkBox(art, place.key, size.width, size.height);
            return <Pressable key={place.key} accessibilityRole="button" accessibilityLabel={place.label}
              accessibilityHint={place.hint} onPress={() => onPlace(place.key, points[place.key])}
              style={[styles.accessiblePlace, { left: box.left, top: box.top, width: box.width, height: box.height }]}
              pointerEvents={named ? "auto" : "box-none"}>
              {named && <Text numberOfLines={1} style={styles.name}>{place.label}</Text>}
            </Pressable>;
          })}
          {tour && current && <Animated.View pointerEvents="none" style={[styles.pointer, { left: current.x - 24, top: current.y - 66, opacity: shown }]}>
            <Ionicons name="arrow-down" size={28} color="#F3D39D" />
          </Animated.View>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, overflow: "hidden", backgroundColor: "#211B16" },
  artwork: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  artStage: { position: "absolute", top: 0, bottom: 0, overflow: "hidden" },
  wideShade: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(25,18,13,0.22)" },
  feather: { position: "absolute", top: 0, bottom: 0, width: 36 },
  featherLeft: { left: 0, backgroundImage: "linear-gradient(90deg, rgba(35,26,20,0.35), rgba(35,26,20,0))" },
  featherRight: { right: 0, backgroundImage: "linear-gradient(270deg, rgba(35,26,20,0.35), rgba(35,26,20,0))" },
  evening: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(17,18,31,0.32)" },
  ambientLight: { position: "absolute", backgroundImage: "radial-gradient(ellipse, rgba(255,201,112,0.18) 0%, rgba(255,201,112,0) 70%)" },
  flame: { position: "absolute", backgroundColor: "#FFE4A5", shadowColor: "#FFB245", shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  accessiblePlace: { position: "absolute", alignItems: "center", justifyContent: "center" },
  name: { color: "#FFF8E9", backgroundColor: "rgba(48,44,40,0.82)", borderRadius: 15, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 6 },
  pointer: { position: "absolute", width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: "#D6AE6D", backgroundColor: "rgba(80,51,65,0.94)", alignItems: "center", justifyContent: "center" },
});
