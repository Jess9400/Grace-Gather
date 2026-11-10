// PROTOTYPE ONLY (not for merge): alternative looks for the rooms, switched on
// from the browser with localStorage.look = "paper" | "light" | "candle".
export type Look = "off" | "paper" | "light" | "candle";
export const look: Look = (() => {
  try {
    const v = (globalThis as { localStorage?: Storage }).localStorage?.getItem(
      "look",
    );
    return v === "paper" || v === "light" || v === "candle" ? v : "off";
  } catch {
    return "off";
  }
})();
export const lookOn = look !== "off";
export const candle = look === "candle";

// Candlelight swaps the whole palette: espresso rooms, ivory words, gold details.
export const candlePalette = {
  paper: "#1B1612",
  ink: "#F4EBDA",
  muted: "#B7A993",
  inactive: "#B7A993",
  green: "#F1E4CB",
  pale: "#2F271F",
  line: "#F4EBDA2D",
  white: "#2A221B",
  gold: "#C9A45C",
  goldInk: "#D9B974",
  cardInk: "#F4EBDA",
  cardMuted: "#B7A993",
  cardLine: "#F4EBDA33",
};
// The diary letter is always a light page with dark ink.
export const letter = candle
  ? { paper: "#F8F0DE", ink: "#302C28", muted: "#746A60", gold: "#806122" }
  : null;

const grain =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.27  0 0 0 0 0.16  0 0 0 0.5 0'/></filter><rect width='220' height='220' filter='url(%23n)'/></svg>\")";
export const backdropLayers: string[] =
  look === "paper"
    ? [
        // Warm light from above, a little deeper toward the edges, on grain.
        "radial-gradient(120% 70% at 50% 0%, #FFFEFA 0%, #FBF5E7 55%, #F3EAD6 100%)",
        grain,
      ]
    : look === "light"
      ? [
          "linear-gradient(180deg, #FFFDF6 0%, #FBF4E6 100%)",
          // Light through the stained glass, falling from the upper right.
          "radial-gradient(42% 26% at 88% 16%, rgba(226,178,74,0.34) 0%, rgba(226,178,74,0) 100%)",
          "radial-gradient(36% 22% at 62% 30%, rgba(196,92,84,0.20) 0%, rgba(196,92,84,0) 100%)",
          "radial-gradient(40% 24% at 30% 44%, rgba(84,124,178,0.18) 0%, rgba(84,124,178,0) 100%)",
          "radial-gradient(46% 26% at 78% 62%, rgba(226,178,74,0.20) 0%, rgba(226,178,74,0) 100%)",
          "radial-gradient(40% 22% at 18% 82%, rgba(196,92,84,0.12) 0%, rgba(196,92,84,0) 100%)",
        ]
      : look === "candle"
        ? [
            "linear-gradient(180deg, #211A14 0%, #17120E 100%)",
            // A candle's glow from above.
            "radial-gradient(70% 38% at 50% 0%, rgba(224,160,82,0.30) 0%, rgba(224,160,82,0) 100%)",
            "radial-gradient(60% 30% at 85% 100%, rgba(201,164,92,0.12) 0%, rgba(201,164,92,0) 100%)",
            grain,
          ]
        : [];
export const lookCard: object | null =
  look === "paper"
    ? {
        backgroundColor: "#FFFFFF",
        borderColor: "#B28A3E4D",
        boxShadow:
          "0px 1px 2px rgba(48,44,40,0.05), 0px 14px 34px rgba(48,44,40,0.09)",
      }
    : look === "light"
      ? {
          backgroundColor: "rgba(255,255,255,0.88)",
          borderColor: "#FFFFFF",
          boxShadow: "0px 10px 30px rgba(120,80,40,0.10)",
        }
      : look === "candle"
        ? {
            backgroundColor: "#2A221B",
            borderColor: "#C9A45C40",
            boxShadow: "0px 14px 34px rgba(0,0,0,0.35)",
          }
        : null;
