import { Room, RoomEvent, RemoteTrack, Track } from "livekit-client";
export async function startAudio() {}
export async function stopAudio() {}
export async function allowMicrophone() {
  return true;
} // LiveKit asks only when the person explicitly unmutes.
export function attachAudio(room: Room) {
  const elements = new Map<RemoteTrack, HTMLMediaElement>();
  const add = (track: RemoteTrack) => {
    if (track.kind !== Track.Kind.Audio) return;
    const el = track.attach();
    el.style.display = "none";
    document.body.appendChild(el);
    elements.set(track, el);
  };
  const remove = (track: RemoteTrack) => {
    track.detach();
    elements.get(track)?.remove();
    elements.delete(track);
  };
  room.on(RoomEvent.TrackSubscribed, add);
  room.on(RoomEvent.TrackUnsubscribed, remove);
  return () => {
    room.off(RoomEvent.TrackSubscribed, add);
    room.off(RoomEvent.TrackUnsubscribed, remove);
    for (const t of elements.keys()) remove(t);
  };
}
export async function outputs() {
  if (
    typeof HTMLMediaElement === "undefined" ||
    !("setSinkId" in HTMLMediaElement.prototype)
  )
    return [];
  return (await Room.getLocalDevices("audiooutput", false)).map((d, i) => ({
    id: d.deviceId,
    label: d.label || "Audio output " + (i + 1),
  }));
}
export async function selectOutput(room: Room, id: string) {
  await room.switchActiveDevice("audiooutput", id);
}
