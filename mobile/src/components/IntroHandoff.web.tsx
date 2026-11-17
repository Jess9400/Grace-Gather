import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useSegments } from "expo-router";
import IntroWalk from "./IntroWalk";
import {
  getIntroHandoff,
  INTRO_HANDOFF_FADE_MS,
  releaseIntroHandoff,
  subscribeIntroHandoff,
} from "../lib/intro-handoff";

const status = {
  en: "Preparing the church entrance",
  pt: "Preparando a entrada da igreja",
  es: "Preparando la entrada de la iglesia",
  ru: "Подготовка входа в церковь",
};

export default function IntroHandoff() {
  const handoff = useSyncExternalStore(
    subscribeIntroHandoff,
    getIntroHandoff,
    () => null,
  );
  const segment = useSegments()[0];
  useEffect(() => {
    // If sign-in or another screen interrupts the handoff, let it show.
    if (
      handoff &&
      segment &&
      !["intro", "(tabs)", "index"].includes(segment) &&
      // Local transition previews use their own routes and contain no account data.
      !(__DEV__ && (segment as string).startsWith("intro-transition-"))
    )
      releaseIntroHandoff(handoff.id);
  }, [handoff, segment]);

  if (!handoff || typeof document === "undefined") return null;
  const reduced = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  return createPortal(
    <div
      role="status"
      aria-label={status[handoff.language]}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        opacity: handoff.fading ? 0 : 1,
        transition: reduced
          ? "none"
          : `opacity ${INTRO_HANDOFF_FADE_MS}ms ease`,
        pointerEvents: handoff.fading ? "none" : "auto",
        background: "#05060C",
      }}
    >
      <div inert aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
        <IntroWalk
          church={handoff.church}
          language={handoff.language}
          stillMoment={handoff.moment}
          onDone={() => {}}
        />
      </div>
    </div>,
    document.body,
  );
}
