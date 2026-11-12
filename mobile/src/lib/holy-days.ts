import { westernAdventStart } from "./church-calendar";
import type { Language, Profile } from "./content";

// The important days of each tradition, for the calendar. Every date is
// computed for the year asked; nothing here is a per-year table. Dates are
// plain civil year/month/day values built with local-date arithmetic, so a
// feast never moves a day in another time zone.

// `month` is 1–12. `date` is the same day as "YYYY-MM-DD".
export type CivilDate = { year: number; month: number; day: number };

export type HolyDayId =
  | "epiphany"
  | "ashWednesday"
  | "palmSunday"
  | "goodFriday"
  | "easter"
  | "ascension"
  | "pentecost"
  | "trinity"
  | "adventSunday"
  | "christmas"
  | "assumption"
  | "allSaints"
  | "immaculateConception"
  | "reformationDay"
  | "holyFriday"
  | "pascha"
  | "nativityNew"
  | "nativityOld"
  | "theophanyNew"
  | "theophanyOld";

export type HolyDay = CivilDate & { id: HolyDayId; date: string };

// "general" is for people still exploring, or who skipped the question.
export type HolyDayCalendar =
  "catholic" | "protestant" | "orthodox" | "general";

// The small illustration drawn for a day: a file name in assets/holy-days.
export type HolyDayArt =
  | "wreath"
  | "eggs"
  | "redegg"
  | "crosses"
  | "palm"
  | "candle"
  | "star"
  | "nativity"
  | "ash"
  | "cloud"
  | "dovefire"
  | "dovewater"
  | "flowers"
  | "halo"
  | "rose"
  | "book";

const civil = (year: number, month: number, day: number): CivilDate => {
  // The Date constructor normalises day overflow (e.g. 30 February) in local
  // time; reading the local fields back keeps the result free of UTC shifts.
  const d = new Date(year, month - 1, day);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
};

export const addDays = (date: CivilDate, days: number) =>
  civil(date.year, date.month, date.day + days);

export const civilKey = (date: CivilDate) =>
  `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;

// Western Easter Sunday: the Gregorian computus (Meeus/Jones/Butcher).
export function westernEaster(year: number): CivilDate {
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100,
    d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451),
    n = h + l - 7 * m + 114;
  return civil(year, Math.floor(n / 31), (n % 31) + 1);
}

// Days the Julian calendar runs behind the civil (Gregorian) one for a Julian
// date: 13 from March 1900 to February 2100.
function julianLag(julianYear: number, julianMonth: number) {
  const y = julianMonth <= 2 ? julianYear - 1 : julianYear;
  return Math.floor(y / 100) - Math.floor(y / 400) - 2;
}

const fromJulian = (year: number, month: number, day: number) =>
  civil(year, month, day + julianLag(year, month));

// Orthodox Pascha: the Julian computus (Meeus), given as the civil date.
export function orthodoxPascha(year: number): CivilDate {
  const a = year % 4,
    b = year % 7,
    c = year % 19,
    d = (19 * c + 15) % 30,
    e = (2 * a + 4 * b - d + 34) % 7,
    n = d + e + 114;
  return fromJulian(year, Math.floor(n / 31), (n % 31) + 1);
}

// Only an explicit answer selects a tradition's calendar. "Still exploring",
// a skipped question, or a profile that was never asked gets the two days
// almost everyone knows.
export function holyDayCalendar(
  profile: Pick<Profile, "faithChoice">,
): HolyDayCalendar {
  const choice = profile.faithChoice;
  return choice === "catholic" ||
    choice === "protestant" ||
    choice === "orthodox"
    ? choice
    : "general";
}

export function holyDaysForCalendar(
  calendar: HolyDayCalendar,
  year: number,
): HolyDay[] {
  const days: HolyDay[] = [];
  const add = (id: HolyDayId, date: CivilDate) =>
    days.push({ id, ...date, date: civilKey(date) });
  if (calendar === "orthodox") {
    const pascha = orthodoxPascha(year);
    // The app does not know the person's jurisdiction, so the fixed feasts
    // appear on both the new (Revised Julian) and the old (Julian) calendar.
    add("theophanyNew", civil(year, 1, 6));
    add("nativityOld", fromJulian(year - 1, 12, 25));
    add("theophanyOld", fromJulian(year, 1, 6));
    add("palmSunday", addDays(pascha, -7));
    add("holyFriday", addDays(pascha, -2));
    add("pascha", pascha);
    add("ascension", addDays(pascha, 39));
    // Orthodox Christians call this feast Trinity Sunday («Троица»).
    add("trinity", addDays(pascha, 49));
    add("nativityNew", civil(year, 12, 25));
  } else if (calendar === "general") {
    add("easter", westernEaster(year));
    add("christmas", civil(year, 12, 25));
  } else {
    const easter = westernEaster(year);
    const advent = westernAdventStart(year);
    add("epiphany", civil(year, 1, 6));
    add("ashWednesday", addDays(easter, -46));
    add("palmSunday", addDays(easter, -7));
    add("goodFriday", addDays(easter, -2));
    add("easter", easter);
    add("ascension", addDays(easter, 39));
    add("pentecost", addDays(easter, 49));
    if (calendar === "catholic") {
      add("assumption", civil(year, 8, 15));
      add("allSaints", civil(year, 11, 1));
      add("immaculateConception", civil(year, 12, 8));
    } else add("reformationDay", civil(year, 10, 31));
    add(
      "adventSunday",
      civil(advent.getFullYear(), advent.getMonth() + 1, advent.getDate()),
    );
    add("christmas", civil(year, 12, 25));
  }
  return days.sort((x, y) => x.date.localeCompare(y.date));
}

export const holyDaysForYear = (
  profile: Pick<Profile, "faithChoice">,
  year: number,
) => holyDaysForCalendar(holyDayCalendar(profile), year);

// `month` is 1–12.
export const holyDaysForMonth = (
  profile: Pick<Profile, "faithChoice">,
  year: number,
  month: number,
) => holyDaysForYear(profile, year).filter((day) => day.month === month);

export const holyDayArt: Record<HolyDayId, HolyDayArt> = {
  epiphany: "star",
  ashWednesday: "ash",
  palmSunday: "palm",
  goodFriday: "crosses",
  easter: "eggs",
  ascension: "cloud",
  pentecost: "dovefire",
  trinity: "dovefire",
  adventSunday: "candle",
  christmas: "wreath",
  assumption: "flowers",
  allSaints: "halo",
  immaculateConception: "rose",
  reformationDay: "book",
  holyFriday: "crosses",
  // Orthodox Easter eggs are dyed red.
  pascha: "redegg",
  nativityNew: "nativity",
  nativityOld: "nativity",
  theophanyNew: "dovewater",
  theophanyOld: "dovewater",
};

// Portuguese, Spanish and Russian await the four-language review.
const L = (en: string, pt: string, es: string, ru: string) => ({
  en,
  pt,
  es,
  ru,
});
export const holyDayNames: Record<HolyDayId, Record<Language, string>> = {
  epiphany: L("Epiphany", "Epifania", "Epifanía", "Богоявление"),
  ashWednesday: L(
    "Ash Wednesday",
    "Quarta-feira de Cinzas",
    "Miércoles de Ceniza",
    "Пепельная среда",
  ),
  palmSunday: L(
    "Palm Sunday",
    "Domingo de Ramos",
    "Domingo de Ramos",
    "Вербное воскресенье",
  ),
  goodFriday: L(
    "Good Friday",
    "Sexta-feira Santa",
    "Viernes Santo",
    "Страстная пятница",
  ),
  easter: L("Easter Sunday", "Domingo de Páscoa", "Domingo de Pascua", "Пасха"),
  ascension: L(
    "Ascension",
    "Ascensão do Senhor",
    "Ascensión del Señor",
    "Вознесение Господне",
  ),
  pentecost: L("Pentecost", "Pentecostes", "Pentecostés", "Пятидесятница"),
  // Russian Orthodox call this feast «Троица»; other languages keep the name
  // they had before.
  trinity: L("Pentecost", "Pentecostes", "Pentecostés", "Троица"),
  adventSunday: L(
    "First Sunday of Advent",
    "Primeiro Domingo do Advento",
    "Primer Domingo de Adviento",
    "Первое воскресенье Адвента",
  ),
  christmas: L("Christmas", "Natal", "Navidad", "Рождество"),
  assumption: L(
    "Assumption of Mary",
    "Assunção de Nossa Senhora",
    "Asunción de María",
    "Успение Пресвятой Девы Марии",
  ),
  allSaints: L(
    "All Saints’ Day",
    "Dia de Todos os Santos",
    "Día de Todos los Santos",
    "День всех святых",
  ),
  immaculateConception: L(
    "Immaculate Conception",
    "Imaculada Conceição",
    "Inmaculada Concepción",
    "Непорочное зачатие Пресвятой Девы Марии",
  ),
  reformationDay: L(
    "Reformation Day",
    "Dia da Reforma",
    "Día de la Reforma",
    "День Реформации",
  ),
  holyFriday: L(
    "Holy Friday",
    "Sexta-feira Santa",
    "Viernes Santo",
    "Великая пятница",
  ),
  pascha: L("Pascha", "Páscoa", "Pascua", "Пасха"),
  nativityNew: L(
    "Nativity (new calendar)",
    "Natividade (calendário novo)",
    "Natividad (calendario nuevo)",
    "Рождество Христово (по новому стилю)",
  ),
  nativityOld: L(
    "Nativity (old calendar)",
    "Natividade (calendário antigo)",
    "Natividad (calendario antiguo)",
    "Рождество Христово (по старому стилю)",
  ),
  theophanyNew: L(
    "Theophany (new calendar)",
    "Teofania (calendário novo)",
    "Teofanía (calendario nuevo)",
    "Крещение Господне (по новому стилю)",
  ),
  theophanyOld: L(
    "Theophany (old calendar)",
    "Teofania (calendário antigo)",
    "Teofanía (calendario antiguo)",
    "Крещение Господне (по старому стилю)",
  ),
};

export const holyDayName = (id: HolyDayId, language: Language) =>
  holyDayNames[id][language] ?? holyDayNames[id].en;
