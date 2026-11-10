import type { Gathering } from "./gatherings";
import type { Language } from "./content";
import { storyText } from "./discover";

// Only match specific, explicit topics. A general loneliness entry must not be
// presented as evidence that an unrelated session addresses mental health.
const topics: Record<string, RegExp> = {
  lonely: /\b(loneliness|lonely|companionship)\b|solidão|soledad|одиночеств/i,
  homesick: /\b(homesick|homesickness)\b|saudade|nostalgia|тоска по дому/i,
  grief: /\b(grief|bereavement)\b|luto|duelo|утрат/i,
  anxiety: /\b(anxiety|anxious)\b|ansiedade|ansiedad|тревог/i,
  "persistent-distress": /\b(depression|depressed)\b|depressão|depresión|депресс/i,
};
export const hasJournalGatheringTopic = (theme: string) => Boolean(topics[theme]);
export function matchingJournalGathering(items: Gathering[], theme: string, language: Language, now = Date.now()) {
  const topic = topics[theme];
  if (!topic) return undefined;
  return items.filter(g => g.status === "published" && g.visibility === "public" && g.language === language && Number.isFinite(Date.parse(g.starts_at)) && Date.parse(g.starts_at) > now && Date.parse(g.ends_at) > now && topic.test(`${g.topic} ${storyText(g.title, language)}`)).sort((a,b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
}
