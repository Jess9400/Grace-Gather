import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { Asset } from "expo-asset";
import { artworkBox, artworkHasTourTarget, artworkPlaceAt, artworkPoints, artworkStage, type ChurchArt } from "../lib/church-art";
import type { ChurchPlace } from "../lib/church-scene";
import { setChurchSnapshot } from "../lib/church-room";
import { useReducedMotion } from "../lib/use-reduced-motion";
import type { PlaceLabel } from "./ChurchScene";
import LivingArtwork from "./LivingArtwork";

const ART = {
  catholic: require("../../assets/church/scenes/catholic.jpg"),
  orthodox: require("../../assets/church/scenes/orthodox.jpg"),
  protestant: require("../../assets/church/scenes/protestant.jpg"),
};
const NIGHT_ART = {
  catholic: require("../../assets/church/scenes/catholic-night.jpg"),
  orthodox: require("../../assets/church/scenes/orthodox-night.jpg"),
  protestant: require("../../assets/church/scenes/protestant-night.jpg"),
};
const TOUR_ORDER: ChurchPlace[] = ["pray", "confession", "gather", "bible", "candles", "pews", "wreath"];

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
  const [readyArt, setReadyArt] = useState<string | null>(null);
  const [focused, setFocused] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [touring, setTouring] = useState<ChurchPlace | null>(null);
  const [shown] = useState(() => new Animated.Value(0));
  const tourTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const artKey = `${art}:${night ? "night" : "day"}`;
  const source = night ? NIGHT_ART[art] : ART[art];
  const ready = readyArt === artKey;
  const points = artworkPoints(art, size.width, size.height);
  const stage = artworkStage(size.width, size.height);
  const keys = places.map((place) => place.key).join(",");

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => sub.remove();
  }, []);

  // The room strips and walk-in transitions use this same covered image.
  useEffect(() => {
    if (!ready || !size.width || !size.height) return;
    try {
      const asset = Asset.fromModule(source);
      const uri = asset.localUri ?? asset.uri;
      if (uri) setChurchSnapshot({ uri, width: size.width, height: size.height, points: artworkPoints(art, size.width, size.height), artStage: artworkStage(size.width, size.height), night, nightArtwork: night });
    } catch {
      // The church remains usable even if an optional room strip is unavailable.
    }
  }, [art, night, ready, size, source]);

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
  const candidate = touring && artworkHasTourTarget(art, touring) ? points[touring] : undefined;
  // On wide screens, cover-cropping may put a real object off-screen.
  const current = candidate && candidate.x >= 24 && candidate.x <= size.width - 24 && candidate.y >= 66 && candidate.y <= size.height - 24 ? candidate : undefined;
  const named = labelsAlways && labelsEnabled && !tour;
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.scene}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      <View style={[styles.artStage, { left: stage.left, width: stage.width }]} pointerEvents="none">
        <Image key={artKey} source={source} resizeMode="cover" style={styles.artwork} accessible={false}
          onLoad={() => setReadyArt(artKey)} onError={onFailure} />
      </View>
      {ready && <LivingArtwork key={artKey} art={art} source={source} running={focused && active && !paused} night={night} still={reduced} />}
      {ready && size.width > 0 && (
        <>
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
  accessiblePlace: { position: "absolute", alignItems: "center", justifyContent: "center" },
  name: { color: "#FFF8E9", backgroundColor: "rgba(48,44,40,0.82)", borderRadius: 15, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 6 },
  pointer: { position: "absolute", width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: "#D6AE6D", backgroundColor: "rgba(80,51,65,0.94)", alignItems: "center", justifyContent: "center" },
});
