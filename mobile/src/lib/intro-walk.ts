// The first-visit intro: a walk at night toward a lit church that ends at its
// door. This file holds the words and the geometry; it imports nothing, so
// the tests can load it directly.

export type IntroLanguage = "en" | "pt" | "es" | "ru";
export type IntroChurch = "catholic" | "orthodox" | "protestant";
export type IntroWalkProps = {
  language: IntroLanguage;
  church: IntroChurch;
  // Called when the person opens the door, or skips the walk.
  onDone: () => void;
};

// Each moment: the line that arrives word by word, the quieter sentence
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
        "Always on the road?",
        "Far from any church, this one travels with you.",
        "Keep walking",
      ],
      [
        "Been away a long time?",
        "No one here will ask where you have been.",
        "Come closer",
      ],
      [
        "Carrying questions?",
        "Bring them as they are. Many have come this way before you.",
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
        "Sempre na estrada?",
        "Longe de qualquer igreja, esta vai com você.",
        "Continuar caminhando",
      ],
      [
        "Faz tempo que você se afastou?",
        "Aqui ninguém vai perguntar por onde você andou.",
        "Chegar mais perto",
      ],
      [
        "Carregando perguntas?",
        "Traga-as como estão. Muitos chegaram assim antes de você.",
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
        "¿Siempre de camino?",
        "Lejos de cualquier iglesia, esta va contigo.",
        "Seguir caminando",
      ],
      [
        "¿Llevas mucho tiempo lejos?",
        "Aquí nadie te preguntará dónde has estado.",
        "Acércate",
      ],
      [
        "¿Cargas con preguntas?",
        "Tráelas tal como son. Muchos llegaron así antes que tú.",
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
        "Идти на свет",
      ],
      [
        "Всегда в дороге?",
        "Вдали от любого храма эта церковь идёт с вами.",
        "Идти дальше",
      ],
      [
        "Давно не были в церкви?",
        "Здесь никто не спросит, где вы были.",
        "Подойти ближе",
      ],
      [
        "Несёте с собой вопросы?",
        "Приносите их такими, какие они есть. Многие приходили так же.",
        "К двери",
      ],
      [
        "Церковь там, где вы",
        "Внутри люди молятся друг за друга, без осуждения. Приходите такими, какие вы есть.",
        "Открыть дверь",
      ],
    ],
  },
};

export const INTRO_MOMENTS = 5;

// ---- The road -----------------------------------------------------------
// Everything on the road (the church, lantern posts, trees) has a place along
// it and is drawn at the size it would have from where the walker stands.
// Sizes are in units of the drawing: at size 1 the church is as wide as a
// 390-point phone. Each step roughly halves the distance to the church.
export const CHURCH_SIZE = [0.1, 0.2, 0.4, 0.8, 2.1];
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
