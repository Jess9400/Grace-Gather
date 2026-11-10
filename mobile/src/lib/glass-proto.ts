// PROTOTYPE ONLY (not for merge): a glass look switched on from the browser,
// localStorage.glass = "soft" | "strong".
export type GlassLevel = "off" | "soft" | "strong";
export const glassLevel: GlassLevel = (() => {
  try {
    const v = (globalThis as { localStorage?: Storage }).localStorage?.getItem(
      "glass",
    );
    return v === "soft" || v === "strong" ? v : "off";
  } catch {
    return "off";
  }
})();
export const glassOn = glassLevel !== "off";
const strong = glassLevel === "strong";
// Frosted cards: white you can faintly see the church light through.
export const glassCard = glassOn
  ? ({
      backgroundColor: strong
        ? "rgba(255,255,255,0.46)"
        : "rgba(255,255,255,0.62)",
      backdropFilter: "blur(18px) saturate(1.15)",
      WebkitBackdropFilter: "blur(18px) saturate(1.15)",
      borderColor: "rgba(255,255,255,0.75)",
      boxShadow: "0px 10px 30px rgba(48,44,40,0.07)",
    } as object)
  : null;
export const glassImageOpacity = strong ? 0.9 : 0.6;
export const glassVeil = strong
  ? "linear-gradient(180deg, rgba(255,252,243,0.38) 0%, rgba(255,252,243,0.58) 55%, rgba(255,252,243,0.72) 100%)"
  : "linear-gradient(180deg, rgba(255,252,243,0.6) 0%, rgba(255,252,243,0.78) 55%, rgba(255,252,243,0.88) 100%)";
