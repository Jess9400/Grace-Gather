import { useSyncExternalStore } from "react";
import type { ChurchPlace } from "./church-scene";

// The church's rooms: places on Home that open their own screen with a strip
// of the church across the top, so the screen feels like part of the church.
// The window (Discover), the altar (prayer requests) and Chats have a strip
// but are not walked to from Home.
export type RoomPlace =
  | "bible"
  | "pews"
  | "gather"
  | "candles"
  | "confession"
  | "window"
  | "altar"
  | "chats";
// The spot in the church each room shows; Chats lives behind the side door.
export const roomSpot = (place: RoomPlace) =>
  place === "chats" ? "gather" : place;

// A picture of the church as it was last seen on Home, with where each place
// sat on screen. Strips crop it, so they always match the person's own church
// (tradition, candles, Advent wreath, day or evening).
export type ChurchSnapshot = {
  uri: string;
  width: number;
  height: number;
  points: Partial<Record<string, { x: number; y: number }>>;
  night?: boolean;
  artStage?: { left: number; width: number };
};

let current: ChurchSnapshot | null = null;
const listeners = new Set<() => void>();
// Web snapshots are blob URLs; keep the last two alive while screens swap.
const blobs: string[] = [];

export function setChurchSnapshot(next: ChurchSnapshot) {
  current = next;
  if (next.uri.startsWith("blob:")) {
    blobs.push(next.uri);
    while (blobs.length > 2) URL.revokeObjectURL(blobs.shift()!);
  }
  listeners.forEach((listener) => listener());
}
export function getChurchSnapshot() {
  return current;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useChurchSnapshot() {
  return useSyncExternalStore(subscribe, getChurchSnapshot, getChurchSnapshot);
}

// How close the walk-in comes to each place, and the strip that continues it.
// Home zooms the church by `zoom` until the place sits at `focusY`; the strip
// shows the same crop, so the hand-off from Home to the screen is seamless.
const ZOOM: Record<RoomPlace, number> = {
  bible: 2.2,
  pews: 1.6,
  gather: 2.6,
  candles: 2.4,
  confession: 2.0,
  window: 1.9,
  altar: 1.9,
  chats: 2.6,
};
export function roomGeometry(place: RoomPlace, topInset: number) {
  // The Bible and Chats keep a shorter strip so their content stays generous.
  const short = place === "bible" || place === "chats";
  const height = topInset + (short ? 176 : 214);
  // The place sits in the clear band between the header row and the fade.
  const band = height - topInset - 46;
  return {
    zoom: ZOOM[place],
    height,
    focusY: topInset + 46 + band * 0.42,
  };
}
// Where the church picture sits in a room's strip. Home's walk-in ends at the
// same spot, so the screen opens on exactly the view the camera arrived at.
export function roomCrop(
  place: RoomPlace,
  topInset: number,
  at: { x: number; y: number },
  stage: { width: number; height: number },
  screenWidth: number,
) {
  const g = roomGeometry(place, topInset);
  const w = stage.width * g.zoom;
  const h = stage.height * g.zoom;
  // Keep the picture covering the whole strip, even near the church's edges.
  const left = Math.min(
    0,
    Math.max(screenWidth - w, screenWidth / 2 - at.x * g.zoom),
  );
  const top = Math.min(0, Math.max(g.height - h, g.focusY - at.y * g.zoom));
  return { ...g, width: w, height: g.height, imageHeight: h, left, top };
}
// While Home is showing, it can walk into a room before another screen opens
// (used by the tab bar). Returns false when Home is not there to walk from.
type Walker = (place: RoomPlace, go: () => void) => boolean;
let walker: Walker | null = null;
export function setWalker(next: Walker) {
  walker = next;
  return () => {
    if (walker === next) walker = null;
  };
}
export function walkFromHome(place: RoomPlace, go: () => void) {
  return walker ? walker(place, go) : false;
}

// Places on Home that walk into a room (the others open as before).
export const isRoomPlace = (
  place: ChurchPlace,
): place is Extract<RoomPlace, ChurchPlace> =>
  place === "bible" ||
  place === "pews" ||
  place === "gather" ||
  place === "candles" ||
  place === "confession";
