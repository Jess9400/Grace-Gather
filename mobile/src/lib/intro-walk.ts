// The first-visit intro: a walk at night toward a lit church that ends at its
// door. This file holds the words and the geometry; it imports nothing, so
// the tests can load it directly.

export type IntroLanguage = "en" | "pt" | "es" | "ru";
export type IntroChurch = "catholic" | "orthodox" | "protestant";
export type IntroWalkProps = {
  language: IntroLanguage;
  church: IntroChurch;
  // Called when the person opens the door, or skips the walk.
  onDone: (moment?: number) => void;
  // A still copy of the current scene bridges navigation on the web.
  stillMoment?: number;
};

// Three moments: far away, part of the way, and at the door. Each has the
// line that arrives word by word, the quieter sentence
// under it, and the button that takes the next steps.
type Moment = [title: string, body: string, action: string];
export const introCopy: Record<
  IntroLanguage,
  { skip: string; moments: Moment[] }
> = {
  en: {
    skip: "Skip",
    moments: [
      [
        "Wherever you are tonight",
        "there is a light left on for you.",
        "Walk toward it",
      ],
      [
        "Always on the road, or away a long time?",
        "This church travels with you, and no one here will ask where you have been.",
        "Up to the door",
      ],
      [
        "A church away from church",
        "Inside, people pray for one another, without judgement. Come as you are.",
        "Open the door",
      ],
    ],
  },
  pt: {
    skip: "Pular",
    moments: [
      [
        "Onde quer que você esteja esta noite",
        "há uma luz acesa à sua espera.",
        "Caminhar até ela",
      ],
      [
        "Sempre na estrada, ou faz tempo que se afastou?",
        "Esta igreja vai com você, e aqui ninguém vai perguntar por onde você andou.",
        "Até a porta",
      ],
      [
        "Uma igreja longe da igreja",
        "Lá dentro, as pessoas oram umas pelas outras, sem julgamentos. Venha como você é.",
        "Abrir a porta",
      ],
    ],
  },
  es: {
    skip: "Omitir",
    moments: [
      [
        "Dondequiera que estés esta noche",
        "hay una luz encendida esperándote.",
        "Caminar hacia ella",
      ],
      [
        "¿Siempre de camino, o mucho tiempo lejos?",
        "Esta iglesia va contigo, y aquí nadie te preguntará dónde has estado.",
        "Hasta la puerta",
      ],
      [
        "Una iglesia lejos de la iglesia",
        "Dentro, la gente ora unos por otros, sin juicios. Ven tal como eres.",
        "Abrir la puerta",
      ],
    ],
  },
  ru: {
    skip: "Пропустить",
    moments: [
      [
        "Где бы вы ни были этой ночью",
        "здесь для вас горит свет.",
        "Пойти к свету",
      ],
      [
        "В дороге или давно не были в церкви?",
        "Эта церковь всегда с вами, и здесь никто не спросит, где вы были.",
        "Подойти к двери",
      ],
      [
        "Церковь там, где вы",
        "Внутри люди молятся друг за друга и никого не осуждают. Приходите такими, какие вы есть.",
        "Открыть дверь",
      ],
    ],
  },
};

export const INTRO_MOMENTS = 3;
// One step of the walk, in milliseconds. The words wait until the walk has
// almost arrived (and, at the start, until the night has faded in).
export const WALK_MS = 3000;
export const wordsWait = (moment: number) => (moment === 0 ? 1500 : 2000);

// ---- The road -----------------------------------------------------------
// Everything on the road (the church, lantern posts, trees) has a place along
// it and is drawn at the size it would have from where the walker stands.
// Sizes are in units of the drawing: at size 1 the church is as wide as a
// 390-point phone: far away, part of the way, and at the door.
export const CHURCH_SIZE = [0.1, 0.4, 2.1];
// How the sky and the light ahead change from moment to moment: how bright
// the stars are, how far the moon has risen and the hills have grown, and
// the size and strength of the glow around the church.
export const STARS_SHOWN = [1, 0.85, 0];
export const MOON_RISE = [0, -16, -32];
export const HILLS_GROWN = [1, 1.18, 1.36];
export const LIGHT_SIZE = [0.26, 0.62, 1.7];
export const LIGHT_SHOWN = [1, 0.85, 0.3];
// How far below the horizon the ground falls, per unit of size.
export const GROUND_DROP = 22;
// Half the width of the road, at size 1.
export const ROAD_HALF = 36;
const CHURCH_AT = 10;
// Closer than this, a thing has been walked past.
const PASSED = 0.22;

export type Placed = {
  // Offset from the point on the horizon the road leads to, and the size.
  x: number;
  y: number;
  size: number;
  away: number;
  passed: boolean;
};
export function placeOnRoad(moment: number, side: number, along: number) {
  const walker = CHURCH_AT - 1 / CHURCH_SIZE[moment];
  const away = along - walker;
  const passed = away <= PASSED;
  // Things already passed slide out of view beside the walker.
  const size = passed ? 6 : 1 / away;
  return {
    x: side * size,
    y: GROUND_DROP * size,
    size,
    away,
    passed,
  } satisfies Placed;
}
export function churchOnRoad(moment: number) {
  return placeOnRoad(moment, 0, CHURCH_AT);
}

// Lantern posts stand in pairs beside the road; nearest the church first, so
// nearer posts are drawn over farther ones.
const LANTERN_SIDE = 58;
export const lanternSpots = [9.3, 9.0, 8.5, 8.0, 6.9, 5.9, 3.4, 1.7].flatMap(
  (along) => [
    { side: -LANTERN_SIDE, along },
    { side: LANTERN_SIDE, along },
  ],
);
// A lantern comes alight as the walker draws near it; none are lit before
// the first step.
export function lanternLit(moment: number, spot: Placed) {
  return moment > 0 && !spot.passed && spot.away <= 3.6;
}
export const treeSpots = [
  { side: 150, along: 9.3 },
  { side: -170, along: 9.1 },
  { side: 190, along: 8.2 },
  { side: -140, along: 7.8 },
  { side: 140, along: 6.4 },
  { side: -200, along: 5.6 },
  { side: 170, along: 3.6 },
  { side: -150, along: 2.6 },
];

// Stars and drifting lights keep the same places on every visit.
function seeded(seed: number) {
  let value = seed;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
}
export function introStars(count = 54) {
  const random = seeded(11);
  return Array.from({ length: count }, () => ({
    size: 1 + random() * 1.6,
    // Fractions of the sky: across, and down from the top to the horizon.
    down: Math.pow(random(), 1.3) * 0.92,
    across: random(),
    opacity: 0.35 + random() * 0.55,
    seconds: 2.6 + random() * 3.6,
    delay: random() * 4,
  }));
}
export function introMotes(count = 8) {
  const random = seeded(29);
  return Array.from({ length: count }, () => ({
    across: 0.1 + random() * 0.8,
    // Offset from the horizon, in drawing units (negative is above it).
    down: -60 + random() * 120,
    seconds: 7 + random() * 6,
    delay: random() * 8,
  }));
}
