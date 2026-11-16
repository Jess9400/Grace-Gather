// Words that suggest someone may be in danger. When they appear, the journal
// shows the support card and a helpline instead of a verse. This is the only
// check for people without an account, so it errs on the side of asking:
// a dramatic "I want to die of embarrassment" also gets the card.
const danger = [
  // English
  /\b(?:kill myself|end my life|take my (?:own )?life|hurt myself|harm myself|self[- ]harm|cut myself|suicid(?:e|al)|want to die|wanna die|wish i (?:was|were) dead|better off dead|(?:don't|do not) want to (?:live|be alive|wake up)|end it all)\b/i,
  // Portuguese
  /(?:me matar|tirar (?:a )?minha (?:própria )?vida|acabar com (?:a )?minha vida|dar fim (?:à|a) minha vida|quero morrer|queria morrer|não quero (?:mais )?viver|me machucar|suicídio|me suicidar)/i,
  // Spanish
  /(?:matarme|quitarme la vida|acabar con mi vida|suicidarme|suicidio|quiero morir|quisiera morir|no quiero (?:seguir )?vivir|hacerme daño)/i,
  // Russian
  /(?:покончить с собой|покончить с жизнью|убить себя|хочу умереть|не хочу жить|самоубийств|навредить себе|причинить себе вред)/i,
];
export function needsSupport(text: string) {
  const plain = text.replace(/[’‘]/g, "'");
  return danger.some((pattern) => pattern.test(plain));
}

// A model's broad mood classification alone is not evidence of an ongoing
// mental-health concern. Offer the optional support card only when the person
// actually writes about it; the separate urgent check above is unchanged.
export function offersOngoingSupport(text: string, theme: string) {
  if (theme !== "persistent-distress") return false;
  const named = /\b(?:depression|depressed|depressive)\b|depress[aã]o|deprimid[oa]|depresi[oó]n|депресси/i.test(text);
  const sustained = /(?:for weeks|for months|every day|há semanas|ha semanas|há meses|ha meses|todos os dias|por semanas|por meses|cada d[ií]a|недел[июь]|месяц|каждый день)/i.test(text);
  const distress = /\b(?:sad|hopeless|cannot cope|can't cope|crying|despair)\b|sem esperan[cç]a|ang[uú]stia|triste|n[aã]o aguento|choro|desespero|sin esperanza|angustia|llorando|невыносим|безнад[её]ж|груст/i.test(text);
  return named || (sustained && distress);
}
