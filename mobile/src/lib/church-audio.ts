import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import * as storage from "./storage";

// A quiet church ambience for Home, heard after entering through the doors.
// It respects the silent switch, mixes with other audio and never plays in the
// background. The person's mute choice is remembered on the device.
const KEY = "church-sound";
const VOLUME = 0.32;
let player: AudioPlayer | null = null;
let fade: ReturnType<typeof setInterval> | null = null;

export async function loadSoundOn() {
  try {
    return (await storage.getItem(KEY)) !== "off";
  } catch {
    return true;
  }
}
export async function saveSoundOn(on: boolean) {
  try {
    await storage.setItem(KEY, on ? "on" : "off");
  } catch {
    // The choice still applies for this visit.
  }
}

function fadeTo(target: number, ms: number, done?: () => void) {
  if (!player) return;
  if (fade) clearInterval(fade);
  const p = player;
  const from = p.volume;
  const steps = Math.max(1, Math.round(ms / 50));
  let i = 0;
  fade = setInterval(() => {
    i++;
    p.volume = from + ((target - from) * i) / steps;
    if (i >= steps) {
      if (fade) clearInterval(fade);
      fade = null;
      done?.();
    }
  }, 50);
}

export function startAmbience() {
  try {
    if (!player) {
      player = createAudioPlayer(require("../../assets/church/ambience.m4a"));
      player.loop = true;
      player.volume = 0;
    }
    void setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
    }).catch(() => {});
    player.play();
    fadeTo(VOLUME, 2500);
  } catch {
    // Sound is a gentle extra; the church works without it.
  }
}

export function stopAmbience() {
  if (!player) return;
  const p = player;
  fadeTo(0, 700, () => {
    try {
      p.pause();
    } catch {
      // Already stopped.
    }
  });
}
