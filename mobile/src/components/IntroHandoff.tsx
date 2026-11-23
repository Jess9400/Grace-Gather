import { useEffect, useState, useSyncExternalStore } from "react";
import { Animated, StyleSheet } from "react-native";
import IntroWalk from "./IntroWalk";
import {
  getIntroHandoff, subscribeIntroHandoff, INTRO_HANDOFF_FADE_MS,
  type IntroHandoff as Scene,
} from "../lib/intro-handoff";

function DoorwayCover({ scene }: { scene: Scene }) {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!scene.fading) return;
    const fade = Animated.timing(opacity, {
      toValue: 0, duration: INTRO_HANDOFF_FADE_MS, useNativeDriver: true,
    });
    fade.start();
    return () => fade.stop();
  }, [opacity, scene.fading]);
  return (
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      pointerEvents={scene.fading ? "none" : "auto"}
      style={[StyleSheet.absoluteFill, { backgroundColor: "#05060C", zIndex: 100, opacity }]}>
      <IntroWalk language={scene.language} church={scene.church} stillMoment={scene.moment} onDone={() => {}} />
    </Animated.View>
  );
}

export default function IntroHandoff() {
  const scene = useSyncExternalStore(subscribeIntroHandoff, getIntroHandoff, () => null);
  return scene ? <DoorwayCover key={scene.id} scene={scene} /> : null;
}
