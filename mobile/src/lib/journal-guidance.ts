import { hopelessWriting } from "../generated/quiet-diary";
import map from "../generated/journal-map.json";
import { chooseJournalAction } from "../generated/journal-selection";
import { Entry, Profile, Mood } from "./content";
import { welcomesCandles } from "./church-calendar";
export function journalTheme(entry: Entry) {
  const saved = map.find((t) => t.id === entry.themeId);
  if (saved) return saved;
  const text = entry.text.toLowerCase().replace(/[’‘]/g, "'");
  const matches: [string, RegExp][] = [
    [
      "persistent-distress",
      /depress|deprim|депресс|for weeks|há semanas|por semanas|недел.*не могу/,
    ],
    [
      "money",
      /rent|money|bills|lost my job|dinheiro|aluguel|desempreg|dinero|alquiler|деньг|аренд/,
    ],
    [
      "grief",
      /died|passed away|funeral|morreu|faleceu|falleci|murió|умер|похорон/,
    ],
    [
      "anniversary",
      /anniversary|aniversário.*morte|aniversario.*muerte|годовщин/,
    ],
    ["illness", /hospital|illness|cancer|doente|enferm|больниц|болезн/],
    ["guilt", /regret|guilt|apolog|culpa|arrepend|perdón|винов|сожале/],
    ["anger", /angry|anger|raiva|furios|enoj|злость|злюсь/],
    ["exhaustion", /exhaust|burnt out|exaust|esgotad|agotad|истощ/],
    ["doubt", /far from god|doubt|longe de deus|dúvida|lejos de dios|сомнен/],
    ["service", /give back|volunteer|voluntár|voluntari|волонт/],
    [
      "venting",
      /someone.*listen|desabaf|alguém.*ouvir|alguien.*escuch|выговор/,
    ],
  ];
  // Prayer addresses God as "You". Do not lose that meaning when the model is
  // unavailable, but keep explicit sustained distress ahead of this fallback.
  const match = matches.find(([id, r]) =>
    id === "doubt" ? spiritualDistance(text) : r.test(text),
  );
  if (!match && hopelessWriting(text))
    return map.find((t) => t.id === "hopelessness")!;
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
      privateOnly:
        /keep.*private|rather.*private|prefiro.*privad|prefiero.*privad|не хочу делиться/i.test(
          entry.text,
        ),
      financialStress: theme.id === "money",
    });
  if (["A01", "A21"].includes(id) && !welcomesCandles(profile)) id = "A02";
  if (
    id === "A18" &&
    /money|bills|rent|dinheiro|aluguel|dinero|alquiler|деньг|аренд/i.test(
      entry.text,
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
