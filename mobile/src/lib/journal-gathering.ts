import { gathering, type Gathering } from "./gatherings";
import { confessionAPI } from "./confession";
import { backend } from "./backend";
import themes from "../generated/journal-map.json";
import type { Language } from "./content";
import { storyText } from "./discover";

// Only match specific, explicit topics. A general loneliness entry must not be
// presented as evidence that an unrelated session addresses mental health.
const topics: Record<string, RegExp> = {
  lonely: /\b(loneliness|lonely|companionship)\b|solidão|soledad|одиночеств/i,
  welcome: /newcomer|welcome|acolhi|boas.vindas|bienvenid|нович/i,
  homesick: /\b(homesick|homesickness)\b|saudade|nostalgia|тоска по дому/i,
  grief: /\b(grief|bereavement)\b|luto|duelo|утрат/i,
  anxiety: /\b(anxiety|anxious)\b|ansiedade|ansiedad|тревог/i,
  "persistent-distress": /\b(depression|depressed)\b|depressão|depresión|депресс/i,
};
export const hasJournalGatheringTopic = (theme: string) => Boolean(topics[theme]);
export function matchingJournalGathering(items: Gathering[], theme: string, language: Language, now = Date.now()) {
  const topic = topics[theme];
  if (!topic) return undefined;
  return items.filter(g => g.status === "published" && g.visibility === "public" && g.language === language && Number.isFinite(Date.parse(g.starts_at)) && Date.parse(g.ends_at) > now && topic.test(`${g.topic} ${storyText(g.title, language)}`)).sort((a,b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
}

// Only offer Confession as the alternative when the person expresses a wish
// to open up. A failed lookup never implies that there are no actual sessions.
export function wantsToOpenUp(text: string) {
  const t = text.toLowerCase().replace(/[’‘]/g, "'");
  if (/\b(?:my (?:brother|sister|friend|mother|father|husband|wife|child)|he|she|they) (?:has|have) (?:no one|nobody) (?:to|they can) (?:talk|speak) to\b/i.test(t)) return false;
  if (/keep (?:this|it) private|(?:don't|do not) (?:want to |need to )?(?:talk|share|join|open up)|(?:just|only) (?:listen|reflect)|no (?:suggestions|advice)|não quero (?:falar|compartilhar)|prefiro.*privad|no quiero (?:hablar|compartir)|prefiero.*privad|не хочу (?:говорить|делиться)/i.test(t)) return false;
  return /\b(?:no one|no-one|nobody|anyone|anybody) (?:to|i can) (?:talk|speak) to\b|\b(?:need|want|wish i had) someone (?:to (?:talk to|listen)|who (?:will|would|can) listen)\b|\b(?:need|want) to (?:talk|vent|open up|share)\b|desabaf|(?:ninguém|alguém).{0,25}(?:conversar|falar|ouvir)|(?:nadie|alguien).{0,25}(?:hablar|escuch)|не с кем (?:поговорить|общаться)|некому меня выслушать/i.test(t);
}
async function available<T>(request: () => Promise<T>): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request(),
      new Promise<undefined>((resolve) => { timer = setTimeout(resolve, 3000); }),
    ]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export const needsActivityCheck = (id: string) => ["A04", "A14", "A25", "A27"].includes(id);

export async function availableJournalAction(
  candidate: string, theme: string, language: Language, text: string,
  previousActions: string[] = [],
): Promise<string | undefined> {
  if (!needsActivityCheck(candidate)) return candidate;
  let action = candidate;
  const wantsListener = wantsToOpenUp(text);
  if (action === "A25") {
    const sessions = hasJournalGatheringTopic(theme) ? await available<Gathering[]>(() => gathering("list")) : undefined;
    if (Array.isArray(sessions) && matchingJournalGathering(sessions, theme, language)) return action;
    if (wantsListener && !previousActions.includes("A04")) action = "A04";
  }
  if (action === "A04" || action === "A14") {
    // This read uses the same account and language filters as the room. It
    // does not reserve a post. An empty room still accepts a new burden.
    const room = await available(() => confessionAPI("list", { language }));
    if (room && Array.isArray(room.items) &&
        (action === "A04" || room.items.length > 0 || room.reserved?.length > 0)) return action;
  }
  if (action === "A27" && await available(async () => Boolean((await backend?.rpc("staff_role"))?.data))) return action;
  let fallback = themes.find(row => row.id === theme)?.private ?? "A08";
  if (fallback === "A23" || (fallback === "A07" && wantsListener)) fallback = "A08";
  return previousActions.includes(fallback) ? undefined : fallback;
}
