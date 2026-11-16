import { AudioSession, registerGlobals } from "@livekit/react-native";
import { AudioModule } from "expo-audio";
import type { Room } from "livekit-client";
import { suspendAmbience } from "../church-audio";
registerGlobals();
let restoreAmbience: (() => void) | null = null;
export async function startAudio() {
  const restore = await suspendAmbience();
  try {
    await AudioSession.startAudioSession();
    restoreAmbience = restore;
  } catch (error) {
    restore();
    throw error;
  }
}
export async function stopAudio() {
  try {
    await AudioSession.stopAudioSession();
  } finally {
    restoreAmbience?.();
    restoreAmbience = null;
  }
}
export function attachAudio(_room: Room) {
  return () => {};
}
export async function allowMicrophone() {
  return (await AudioModule.requestRecordingPermissionsAsync()).granted;
}
export async function outputs() {
  return (await AudioSession.getAudioOutputs()).map((id) => ({
    id,
    label: id.replaceAll("_", " "),
  }));
}
export async function selectOutput(_room: Room, id: string) {
  await AudioSession.selectAudioOutput(id);
}
