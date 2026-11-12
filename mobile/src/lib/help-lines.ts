import type { Language, Profile } from "./content";

// Where to find a person to talk to right now. Brazil, the main audience, has
// CVV (188, free, 24 hours). Everywhere else, findahelpline.com lists free
// helplines by country, which is safer than guessing numbers for every place.
const L = (en: string, pt: string, es: string, ru: string) => ({
  en,
  pt,
  es,
  ru,
});
const words = {
  ask: L(
    "In danger or thinking about hurting yourself?",
    "Em perigo ou pensando em se machucar?",
    "¿En peligro o pensando en hacerte daño?",
    "Вам угрожает опасность или вы думаете о том, чтобы причинить себе вред?",
  ),
  brazil: L(
    "Call CVV on 188, free and open 24 hours, or chat at cvv.org.br.",
    "Ligue 188 para o CVV, de graça e 24 horas por dia, ou converse pelo chat em cvv.org.br.",
    "Llama al CVV al 188, gratis las 24 horas, o chatea en cvv.org.br.",
    "Позвоните в CVV по номеру 188 (бесплатно, круглосуточно) или напишите в чат на cvv.org.br.",
  ),
  outsideBrazil: L(
    "Outside Brazil, findahelpline.com lists free helplines in your country.",
    "Fora do Brasil, o site findahelpline.com mostra linhas de apoio gratuitas no seu país.",
    "Fuera de Brasil, findahelpline.com muestra líneas de ayuda gratuitas en tu país.",
    "За пределами Бразилии бесплатные линии помощи в вашей стране можно найти на findahelpline.com.",
  ),
  anywhere: L(
    "Find a free helpline in your country at findahelpline.com, or call your local emergency number.",
    "Encontre uma linha de apoio gratuita no seu país em findahelpline.com, ou ligue para o número de emergência local.",
    "Encuentra una línea de ayuda gratuita en tu país en findahelpline.com, o llama al número de emergencias local.",
    "Найдите бесплатную линию помощи в вашей стране на findahelpline.com или позвоните в местную экстренную службу.",
  ),
  gentle: L(
    "If this heaviness stays with you, you don’t have to carry it alone. Talking with someone can help.",
    "Se esse peso continuar, você não precisa carregá-lo sozinho. Conversar com alguém pode ajudar.",
    "Si este peso sigue contigo, no tienes que cargarlo solo. Hablar con alguien puede ayudar.",
    "Если эта тяжесть не уходит, не нужно нести её в одиночку. Может помочь разговор с кем-нибудь.",
  ),
};
export function helpCopy(language: Language, key: keyof typeof words) {
  return words[key][language];
}

// Brazil is assumed only for Portuguese speakers who chose Brazil, since the
// country starts as Brazil for everyone during sign-up.
export function inBrazil(profile: Pick<Profile, "language" | "country">) {
  return profile.language === "pt" && profile.country === "BR";
}

export function helplineText(profile: Pick<Profile, "language" | "country">) {
  const lang = profile.language;
  return inBrazil(profile)
    ? `${helpCopy(lang, "brazil")} ${helpCopy(lang, "outsideBrazil")}`
    : helpCopy(lang, "anywhere");
}

export function helplineUrl(profile: Pick<Profile, "language" | "country">) {
  return inBrazil(profile) ? "https://cvv.org.br" : "https://findahelpline.com";
}
