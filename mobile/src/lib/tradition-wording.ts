// Russian Orthodox Christians say «поставить свечу» ("to set a candle"),
// not «зажечь свечу». When the app is in Russian and the person is Orthodox,
// the candle wording follows their usage everywhere copy is looked up.
let orthodoxRussian = false;

export function setTraditionWording(orthodox: boolean, language: string) {
  orthodoxRussian = orthodox && language === "ru";
}

const swaps: [RegExp, string][] = [
  [/Зажечь свечу/g, "Поставить свечу"],
  [/зажечь свечу/g, "поставить свечу"],
  [/Зажгите свечу/g, "Поставьте свечу"],
  [/Зажечь ещё одну/g, "Поставить ещё одну"],
  [/вы зажгли сегодня/g, "вы поставили сегодня"],
  [/чтобы зажечь её/g, "чтобы поставить её"],
  [/Зажжённая свеча/g, "Поставленная свеча"],
];

export function traditionWording(text: string) {
  if (!orthodoxRussian || !text) return text;
  return swaps.reduce((t, [from, to]) => t.replace(from, to), text);
}
