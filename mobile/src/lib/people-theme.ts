// Colours for "Your people": each group chat has its own soft tint, and each
// person a small coloured circle with their initial. These pastels come from
// the approved Gather prototype, deepened to sit in the candlelit rooms.
export type RoomTheme = { tint: string; dot: string };
const THEMES: RoomTheme[] = [
  { tint: "#3B2723", dot: "#D28E77" }, // rose
  { tint: "#2B3125", dot: "#93AB86" }, // sage
  { tint: "#302A38", dot: "#A592BE" }, // lavender
  { tint: "#262E36", dot: "#8BA0B2" }, // blue-grey
  { tint: "#3A2F1C", dot: "#C9A45C" }, // gold
];
const AVATARS = ["#E9C98A", "#CBD8C4", "#E6C8BC", "#D9C4B0", "#D5CCE0"];
// A small stable number from a string, so a room or a person keeps its colour.
function pick(text: string, size: number) {
  let sum = 0;
  for (let i = 0; i < text.length; i++)
    sum = (sum * 31 + text.charCodeAt(i)) >>> 0;
  return sum % size;
}
// Rooms known today get a chosen colour; new rooms get a stable one by name.
const BY_SLUG: Record<string, number> = { everyone: 0 };
export function roomTheme(slug: string): RoomTheme {
  return THEMES[BY_SLUG[slug] ?? pick(slug, THEMES.length)];
}
export function avatarColor(name: string) {
  return AVATARS[pick(name, AVATARS.length)];
}
export function initial(name: string) {
  const first = [...name.trim()][0];
  return first ? first.toUpperCase() : "·";
}
