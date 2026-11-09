import { colors } from "../components/quiet-ui";
import { Gathering } from "./gatherings";

/**
 * Gatherings will be themed, but the themes are not decided yet.
 * Until they are, every gathering uses the shared gold accent.
 * When themes are agreed, add one entry per topic here (lower-case topic →
 * accent), using a colour from the approved palette.
 */
const themes: Record<string, { accent: string }> = {};

export function gatheringTheme(g: Pick<Gathering, "topic">) {
  return themes[(g.topic ?? "").trim().toLowerCase()] ?? { accent: colors.gold };
}
