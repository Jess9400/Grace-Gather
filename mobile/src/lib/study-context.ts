import type { AtlasRegion } from "./study-atlas";
const NT = [
  "MAT",
  "MRK",
  "LUK",
  "JHN",
  "ACT",
  "ROM",
  "1CO",
  "2CO",
  "GAL",
  "EPH",
  "PHP",
  "COL",
  "1TH",
  "2TH",
  "1TI",
  "2TI",
  "TIT",
  "PHM",
  "HEB",
  "JAS",
  "1PE",
  "2PE",
  "1JN",
  "2JN",
  "3JN",
  "JUD",
  "REV",
];
export function historicalContext(id: string): {
  book: string;
  chapter: number;
  region: AtlasRegion;
  period: string[];
  modules: string[];
} {
  const [book, ch] = id.split(":").pop()!.split(".");
  const chapter = Number(ch);
  const base = { book, chapter };
  if (NT.includes(book))
    return {
      ...base,
      region: ["MAT", "MRK", "LUK", "JHN"].includes(book)
        ? "levant"
        : "mediterranean",
      period: [
        "First-century Roman world",
        "Mundo romano do século I",
        "Mundo romano del siglo I",
        "Римский мир I века",
      ],
      modules: [
        "rome",
        "households",
        ...(["MAT", "MRK", "LUK", "JHN"].includes(book) ? ["rural"] : []),
      ],
    };
  if (["EZR", "NEH", "EST", "HAG", "ZEC"].includes(book))
    return {
      ...base,
      region: "east",
      period: [
        "Persian imperial setting · 539–330 BCE",
        "Contexto imperial persa · 539–330 a.C.",
        "Contexto imperial persa · 539–330 a. C.",
        "Персидская имперская эпоха · 539–330 до н. э.",
      ],
      modules: ["persia"],
    };
  if (
    ["EZK", "DAN", "LAM", "BAR"].includes(book) ||
    (book === "ISA" && chapter >= 40)
  )
    return {
      ...base,
      region: "east",
      period: [
        "Exile and empire · narrative setting",
        "Exílio e império · época narrada",
        "Exilio e imperio · época narrada",
        "Изгнание и империя · время повествования",
      ],
      modules: ["exile", "persia"],
    };
  if (["EXO", "LEV", "NUM", "DEU"].includes(book))
    return {
      ...base,
      region: "levant",
      period: [
        "Exodus and wilderness · dating disputed",
        "Êxodo e deserto · datação discutida",
        "Éxodo y desierto · datación discutida",
        "Исход и пустыня · датировка спорна",
      ],
      modules: ["egypt"],
    };
  if (
    [
      "1SA",
      "2SA",
      "1KI",
      "2KI",
      "1CH",
      "2CH",
      "ISA",
      "JER",
      "HOS",
      "AMO",
      "MIC",
      "NAH",
      "ZEP",
      "HAB",
    ].includes(book)
  )
    return {
      ...base,
      region: "east",
      period: [
        "Kingdoms and empires · book background",
        "Reinos e impérios · contexto do livro",
        "Reinos e imperios · contexto del libro",
        "Царства и империи · фон книги",
      ],
      modules: ["kingdoms"],
    };
  return {
    ...base,
    region: "east",
    period: [
      "Ancient Near East · book-level geography",
      "Antigo Oriente Próximo · geografia do livro",
      "Antiguo Oriente Próximo · geografía del libro",
      "Древний Ближний Восток · география книги",
    ],
    modules: [],
  };
}
export const contextLanguageIndex = { en: 0, pt: 1, es: 2, ru: 3 } as const;
