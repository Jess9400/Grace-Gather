import { AudioSession, registerGlobals } from "@livekit/react-native";
import { AudioModule } from "expo-audio";
import type { Room } from "livekit-client";
registerGlobals();
export async function startAudio() {
  await AudioSession.startAudioSession();
}
export async function stopAudio() {
  await AudioSession.stopAudioSession();
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
