import type { IntroChurch, IntroLanguage } from "./intro-walk";

// A short-lived, in-memory cover for the web route change. No account or
// journal content is stored here. The actual entrance still owns the doors.
export const INTRO_HANDOFF_FADE_MS = 650;
export const INTRO_HANDOFF_TIMEOUT_MS = 10000;

type Scene = { church: IntroChurch; language: IntroLanguage; moment: number };
export type IntroHandoff = Scene & { id: number; fading: boolean };

let current: IntroHandoff | null = null;
let generation = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function getIntroHandoff() {
  return current;
}

export function subscribeIntroHandoff(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function beginIntroHandoff(scene: Scene) {
  if (timer) clearTimeout(timer);
  const id = ++generation;
  current = { ...scene, id, fading: false };
  notify();
  // If navigation or rendering fails, never leave the member behind a cover.
  timer = setTimeout(() => releaseIntroHandoff(id), INTRO_HANDOFF_TIMEOUT_MS);
}

export function releaseIntroHandoff(expectedId?: number) {
  if (
    !current ||
    current.fading ||
    (expectedId !== undefined && current.id !== expectedId)
  )
    return;
  if (timer) clearTimeout(timer);
  const id = current.id;
  current = { ...current, fading: true };
  notify();
  timer = setTimeout(() => {
    if (current?.id !== id) return;
    current = null;
    timer = undefined;
    notify();
  }, INTRO_HANDOFF_FADE_MS);
}
