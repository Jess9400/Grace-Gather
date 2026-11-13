import { hopelessWriting } from "../generated/quiet-diary";
import map from "../generated/journal-map.json";
import { chooseJournalAction } from "../generated/journal-selection";
import { Entry, Profile, Mood } from "./content";
import { welcomesCandles } from "./church-calendar";
// Letters of the four app languages, for finding where a word starts.
const LETTER = "a-zà-ÿа-яё0-9";
// "not" and its Portuguese, Spanish and Russian forms. "Never" and "can't" are
// left out: "I've never been so tired" and "I can't stop crying" still say it.
const NEGATION = new RegExp(
  `(?:^|[^${LETTER}'])(?:not|no|don't|didn't|isn't|wasn't|não|nao|nem|не|ни)$`,
);
// True when the text says one of these words (or a word beginning with one of
// them). Keywords match from the start of a word only, so "parents" does not
// say "rent" and "studied" does not say "died"; a keyword may carry its own
// lookahead, as in "hospital(?!it)" for "hospitality". With `negatable`, a
// "not" among the three words before cancels it: "I'm not angry", "я не
// виноват". Only feelings are negatable: "I have no money" is still money.
export function says(text: string, keywords: string, negatable = false) {
  const pattern = new RegExp(`(^|[^${LETTER}])(?:${keywords})`, "g");
  for (const m of text.matchAll(pattern)) {
    if (!negatable) return true;
    const start = (m.index ?? 0) + m[1].length;
    const before = text
      .slice(Math.max(0, start - 50), start)
      .trim()
      .split(/\s+/)
      .slice(-3);
    if (!before.some((word) => NEGATION.test(word))) return true;
  }
  return false;
}
// Themes about a feeling, where "not" changes what the person is saying.
const NEGATABLE = new Set([
  "persistent-distress",
  "guilt",
  "anger",
  "exhaustion",
  "service",
]);
export function journalTheme(entry: Entry) {
  const saved = map.find((t) => t.id === entry.themeId);
  if (saved) return saved;
  const text = entry.text.toLowerCase().replace(/[’‘]/g, "'");
  // Each theme's words, matched from the start of a word (see `says`).
  const matches: [string, string][] = [
    [
      "persistent-distress",
      "depress|deprim|депресс|for weeks|há semanas|por semanas|недел.*не могу",
    ],
    [
      "money",
      "rent\\b|rents\\b|money|bills|lost my job|dinheiro|aluguel|desempreg|dinero|alquiler|деньг|денег|аренд",
    ],
    [
      "grief",
      "died|passed away|funeral|morreu|faleceu|falleci|murió|умер|похорон",
    ],
    [
      "anniversary",
      "anniversary|aniversário.*morte|aniversario.*muerte|годовщин",
    ],
    [
      "illness",
      "hospital(?!it)|illness|cancer|doente|enferm|больниц|болезн",
    ],
    ["guilt", "regret|guilt|apolog|culpa|arrepend|perdón|винов|сожале"],
    ["anger", "angry|anger|raiva|furios|enoj|злость|злюсь"],
    ["exhaustion", "exhaust|burnt out|exaust|esgotad|agotad|истощ"],
    ["doubt", ""],
    ["service", "give back|volunteer|voluntár|voluntari|волонт"],
    [
      "venting",
      "someone.*listen|desabaf|alguém.*ouvir|alguien.*escuch|выговор",
    ],
  ];
  // Prayer addresses God as "You". Do not lose that meaning when the model is
  // unavailable, but keep explicit sustained distress ahead of this fallback.
  const match = matches.find(([id, words]) =>
    id === "doubt"
      ? spiritualDistance(text)
      : says(text, words, NEGATABLE.has(id)),
  );
  if (!match && hopelessWriting(text))
    return map.find((t) => t.id === "hopelessness")!;
  // Thanks comes after every hard theme and hopelessness, so a difficult
  // moment written with "thank you" still finds the theme it needs.
  if (
    !match &&
    says(
      text,
      "thank|grateful|gratitude|obrigad|agradeç|grat[oa](?![a-z])|gracias|agradec|спасибо|благодар",
      true,
    )
  )
    return map.find((t) => t.id === "gratitude")!;
  const defaults: Record<Mood, string> = {
    sad: "sadness",
    lonely: "lonely",
    anxious: "anxiety",
    overwhelmed: "overwhelm",
    grateful: "gratitude",
    peaceful: "peace",
    hopeful: "hope",
    hopeless: "hopelessness",
    unsure: "unclear",
  };
  return map.find((t) => t.id === (match?.[0] ?? defaults[entry.mood]))!;
}

export function spiritualDistance(text: string) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .split(/[.!?;\n]+/)
    .some((part) => {
      if (
        /\b(?:not|no longer)\s+(?:feel(?:ing)?\s+)?(?:so\s+)?(?:far|distant|disconnected)|\b(?:don't|do not) feel (?:far|distant|disconnected)|\b(?:no|without) doubts?\b|não (?:me )?sinto (?:longe|distante)|ya no (?:me siento )?(?:lejos|desconectad)|не чувствую.*(?:далеко|отдал)/.test(
          part,
        )
      )
        return false;
      return /\b(far|distant|disconnected|separated) from (god|you)\b|\b(god|you) (?:feel|feels|seem|seems|are|is) (?:so |very )?(?:far|distant)\b|\bcloser to (god|you)\b|\b(doubt|doubts)\b|longe de (deus|ti|você)|distante de (deus|ti|você)|perto de (deus|ti)|dúvida|lejos de (dios|ti)|desconectad[oa] de (dios|ti)|cerca de (dios|ti)|далек[оа]? от (бога|тебя)|ближе к (богу|тебе)|сомнен/.test(
        part,
      );
    });
}
export function journalAction(entry: Entry, profile: Profile) {
  const theme = journalTheme(entry);
  let id =
    entry.suggestedAction ??
    chooseJournalAction(theme, {
      candles: welcomesCandles(profile),
      connectedActions: true,
      privateOnly:
        /keep.*private|rather.*private|prefiro.*privad|prefiero.*privad|не хочу делиться/i.test(
          entry.text,
        ),
      financialStress: theme.id === "money",
    });
  if (["A01", "A21"].includes(id) && !welcomesCandles(profile)) id = "A02";
  if (
    id === "A18" &&
    says(
      entry.text.toLowerCase(),
      "money|bills|rent\\b|rents\\b|dinheiro|aluguel|dinero|alquiler|деньг|денег|аренд",
    )
  )
    id = "A03";
  if (
    !entry.suggestedAction &&
    theme.id === "gratitude" &&
    /thank|agradec|gracias|благодар/i.test(entry.text)
  )
    id = "A12";
  // The owner requested a private 24-hour reflection for hopelessness.
  // Keep persistent distress and safety handling separate from this invitation.
  if (theme.id === "hopelessness" && (!entry.suggestedAction || id === "A04"))
    id = "A08";
  return id;
}
