import type { ChurchPlace } from "./church-scene";

export type ChurchArt = "catholic" | "orthodox" | "protestant";
type Box = readonly [number, number, number, number];
type Point = { x: number; y: number };
const IMAGE_WIDTH = 869;
const IMAGE_HEIGHT = 1810;

// Coordinates are relative to the original artwork, before it is covered to
// fit the screen. They follow objects in each individual sanctuary.
const BOXES: Record<ChurchArt, Record<ChurchPlace, Box>> = {
  catholic: {
    candles: [0.01, 0.46, 0.22, 0.56],
    confession: [0.68, 0.31, 1, 0.57],
    bible: [0.22, 0.43, 0.34, 0.55],
    gather: [0.02, 0.60, 0.24, 0.72],
    pews: [0.19, 0.58, 0.81, 0.84],
    pray: [0.34, 0.45, 0.67, 0.55],
    wreath: [0.34, 0.55, 0.47, 0.61],
  },
  orthodox: {
    candles: [0, 0.5, 0.25, 0.62],
    confession: [0.40, 0.43, 0.59, 0.60],
    bible: [0.79, 0.43, 0.98, 0.61],
    gather: [0.02, 0.64, 0.22, 0.75],
    pews: [0.24, 0.64, 0.77, 0.88],
    pray: [0.19, 0.39, 0.36, 0.54],
    wreath: [0.35, 0.58, 0.48, 0.64],
  },
  protestant: {
    candles: [0.8, 0.49, 0.98, 0.58],
    confession: [0.72, 0.56, 0.97, 0.76],
    bible: [0.36, 0.51, 0.64, 0.59],
    gather: [0.02, 0.61, 0.24, 0.72],
    pews: [0.25, 0.64, 0.7, 0.87],
    pray: [0.4, 0.24, 0.6, 0.42],
    wreath: [0.33, 0.58, 0.48, 0.64],
  },
};

// Only point to objects that actually appear in each sanctuary. The tour
// caption remains an accessible action when a place has no pictured object.
export function artworkHasTourTarget(art: ChurchArt, place: ChurchPlace) {
  if (place === "wreath") return false;
  if (place === "confession" && art === "protestant") return false;
  if (place === "candles" && art === "protestant") return false;
  return true;
}

// Also used by room strips and walk-in transitions.
const ROOM_POINTS: Record<ChurchArt, Record<"window" | "altar", Point>> = {
  catholic: { window: { x: 0.5, y: 0.26 }, altar: { x: 0.5, y: 0.48 } },
  orthodox: { window: { x: 0.5, y: 0.2 }, altar: { x: 0.5, y: 0.46 } },
  protestant: { window: { x: 0.13, y: 0.36 }, altar: { x: 0.5, y: 0.5 } },
};

// Cover the entire viewport, including on tablets and desktop previews.
export function artworkStage(width: number, _height: number) {
  return { left: 0, width };
}

export function artworkFrame(width: number, height: number) {
  const stage = artworkStage(width, height);
  const scale = Math.max(stage.width / IMAGE_WIDTH, height / IMAGE_HEIGHT);
  const imageWidth = IMAGE_WIDTH * scale;
  const imageHeight = IMAGE_HEIGHT * scale;
  return {
    width: imageWidth,
    height: imageHeight,
    left: (width - imageWidth) / 2,
    top: (height - imageHeight) / 2,
  };
}

export function artworkBox(art: ChurchArt, place: ChurchPlace, width: number, height: number) {
  const f = artworkFrame(width, height);
  const [x1, y1, x2, y2] = BOXES[art][place];
  return { left: f.left + x1 * f.width, top: f.top + y1 * f.height, width: (x2 - x1) * f.width, height: (y2 - y1) * f.height };
}

export function artworkPoints(art: ChurchArt, width: number, height: number) {
  const points: Partial<Record<string, Point>> = {};
  const f = artworkFrame(width, height);
  for (const [key, box] of Object.entries(BOXES[art])) {
    points[key] = { x: f.left + ((box[0] + box[2]) / 2) * f.width, y: f.top + ((box[1] + box[3]) / 2) * f.height };
  }
  for (const [key, point] of Object.entries(ROOM_POINTS[art])) {
    points[key] = { x: f.left + point.x * f.width, y: f.top + point.y * f.height };
  }
  return points;
}

export function artworkPlaceAt(art: ChurchArt, width: number, height: number, x: number, y: number, places: ChurchPlace[]) {
  if (!width || !height || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const stage = artworkStage(width, height);
  if (x < stage.left || x > stage.left + stage.width || y < 0 || y > height) return null;
  let best: ChurchPlace | null = null;
  let area = Infinity;
  for (const place of places) {
    const box = artworkBox(art, place, width, height);
    const next = box.width * box.height;
    if (x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height && next < area) {
      best = place;
      area = next;
    }
  }
  return best;
}
