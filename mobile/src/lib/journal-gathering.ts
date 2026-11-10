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

// Only offer Confession as the alternative when the person expresses a wish
// to open up. A failed lookup never implies that there are no actual sessions.
export function wantsToOpenUp(text: string) {
  const t = text.toLowerCase().replace(/[’‘]/g, "'");
  if (/\b(?:my (?:brother|sister|friend|mother|father|husband|wife|child)|he|she|they) (?:has|have) (?:no one|nobody) (?:to|they can) (?:talk|speak) to\b/i.test(t)) return false;
  if (/keep (?:this|it) private|(?:don't|do not) (?:want to |need to )?(?:talk|share|join|open up)|(?:just|only) (?:listen|reflect)|no (?:suggestions|advice)|não quero (?:falar|compartilhar)|prefiro.*privad|no quiero (?:hablar|compartir)|prefiero.*privad|не хочу (?:говорить|делиться)/i.test(t)) return false;
  return /\b(?:no one|no-one|nobody|anyone|anybody) (?:to|i can) (?:talk|speak) to\b|\b(?:need|want|wish i had) someone (?:to (?:talk to|listen)|who (?:will|would|can) listen)\b|\b(?:need|want) to (?:talk|vent|open up|share)\b|desabaf|(?:ninguém|alguém).{0,25}(?:conversar|falar|ouvir)|(?:nadie|alguien).{0,25}(?:hablar|escuch)|не с кем (?:поговорить|общаться)|некому меня выслушать/i.test(t);
}
export async function availableJournalAction(
  theme: string,
  language: Language,
  text: string,
  previousActions: string[],
  list: () => Promise<Gathering[]>,
  requireAction: boolean,
): Promise<string | undefined> {
  try {
    if (hasJournalGatheringTopic(theme)) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const items = await Promise.race([
          list(),
          new Promise<undefined>((resolve) => { timer = setTimeout(() => resolve(undefined), 3000); }),
        ]);
        if (Array.isArray(items) && matchingJournalGathering(items, theme, language)) return "A25";
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  } catch {
    // No gathering can be verified. Do not advertise one.
  }
  if (!previousActions.includes("A04") && wantsToOpenUp(text)) return "A04";
  return requireAction ? "A08" : undefined;
}
