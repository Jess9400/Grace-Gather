import type { Language } from "./content";
const terms: Record<string, [string, string, string, string]> = {
  noun: ["noun", "substantivo", "sustantivo", "существительное"],
  verb: ["verb", "verbo", "verbo", "глагол"],
  adjective: ["adjective", "adjetivo", "adjetivo", "прилагательное"],
  pronoun: ["pronoun", "pronome", "pronombre", "местоимение"],
  article: ["article", "artigo", "artículo", "артикль"],
  preposition: ["preposition", "preposição", "preposición", "предлог"],
  conjunction: ["conjunction", "conjunção", "conjunción", "союз"],
  adverb: ["adverb", "advérbio", "adverbio", "наречие"],
  nominative: ["nominative", "nominativo", "nominativo", "именительный"],
  genitive: ["genitive", "genitivo", "genitivo", "родительный"],
  dative: ["dative", "dativo", "dativo", "дательный"],
  accusative: ["accusative", "acusativo", "acusativo", "винительный"],
  vocative: ["vocative", "vocativo", "vocativo", "звательный"],
  singular: ["singular", "singular", "singular", "единственное число"],
  plural: ["plural", "plural", "plural", "множественное число"],
  dual: ["dual", "dual", "dual", "двойственное число"],
  masculine: ["masculine", "masculino", "masculino", "мужской род"],
  feminine: ["feminine", "feminino", "femenino", "женский род"],
  neuter: ["neuter", "neutro", "neutro", "средний род"],
  present: ["present", "presente", "presente", "настоящее"],
  imperfect: ["imperfect", "imperfeito", "imperfecto", "имперфект"],
  future: ["future", "futuro", "futuro", "будущее"],
  aorist: ["aorist", "aoristo", "aoristo", "аорист"],
  perfect: ["perfect", "perfeito", "perfecto", "перфект"],
  pluperfect: [
    "pluperfect",
    "mais-que-perfeito",
    "pluscuamperfecto",
    "плюсквамперфект",
  ],
  active: ["active", "voz ativa", "voz activa", "действительный залог"],
  middle: ["middle", "voz média", "voz media", "средний залог"],
  passive: ["passive", "voz passiva", "voz pasiva", "страдательный залог"],
  indicative: ["indicative", "indicativo", "indicativo", "изъявительное"],
  subjunctive: ["subjunctive", "subjuntivo", "subjuntivo", "сослагательное"],
  imperative: ["imperative", "imperativo", "imperativo", "повелительное"],
  infinitive: ["infinitive", "infinitivo", "infinitivo", "инфинитив"],
  participle: ["participle", "particípio", "participio", "причастие"],
  construct: [
    "construct state",
    "estado construto",
    "estado constructo",
    "сопряжённое состояние",
  ],
  absolute: [
    "absolute state",
    "estado absoluto",
    "estado absoluto",
    "абсолютное состояние",
  ],
  first: ["first person", "primeira pessoa", "primera persona", "первое лицо"],
  second: ["second person", "segunda pessoa", "segunda persona", "второе лицо"],
  third: ["third person", "terceira pessoa", "tercera persona", "третье лицо"],
};
export function grammarDescription(code: string, language: Language) {
  const words: string[] = [];
  const add = (key: string | undefined) => {
    if (key && terms[key])
      words.push(terms[key][["en", "pt", "es", "ru"].indexOf(language)]);
  };
  if (code.startsWith("H") || (code.startsWith("A") && !code.includes("-"))) {
    for (const part of code.slice(1).split("/")) {
      const pos = part[0];
      add(
        (
          {
            N: "noun",
            V: "verb",
            A: "adjective",
            P: "pronoun",
            T: "article",
            R: "preposition",
            C: "conjunction",
            D: "adverb",
          } as Record<string, string>
        )[pos],
      );
      if (pos === "N" || pos === "A") {
        add(
          ({ m: "masculine", f: "feminine" } as Record<string, string>)[
            part[2]
          ],
        );
        add(
          ({ s: "singular", p: "plural", d: "dual" } as Record<string, string>)[
            part[3]
          ],
        );
        add(
          ({ a: "absolute", c: "construct" } as Record<string, string>)[
            part[4]
          ],
        );
      }
      // Stem codes (Qal, Piel, etc.) remain source codes; don't invent an English tense.
      if (pos === "V") {
        add(
          (
            {
              p: "perfect",
              q: "imperfect",
              r: "participle",
              s: "participle",
              c: "infinitive",
              a: "infinitive",
              v: "imperative",
            } as Record<string, string>
          )[part[2]],
        );
      }
    }
  } else {
    const parts = code.split("-");
    add(
      (
        {
          N: "noun",
          V: "verb",
          A: "adjective",
          P: "pronoun",
          T: "article",
          PREP: "preposition",
          CONJ: "conjunction",
          ADV: "adverb",
        } as Record<string, string>
      )[parts[0]],
    );
    if (parts[0] === "V") {
      const p = parts[1]?.replace(/^2/, "") ?? "";
      add(
        (
          {
            P: "present",
            I: "imperfect",
            F: "future",
            A: "aorist",
            R: "perfect",
            L: "pluperfect",
          } as Record<string, string>
        )[p[0]],
      );
      add(
        ({ A: "active", M: "middle", P: "passive" } as Record<string, string>)[
          p[1]
        ],
      );
      add(
        (
          {
            I: "indicative",
            S: "subjunctive",
            M: "imperative",
            N: "infinitive",
            P: "participle",
          } as Record<string, string>
        )[p[2]],
      );
    }
    const tail = parts[2] ?? parts[1] ?? "";
    add(
      (
        {
          N: "nominative",
          G: "genitive",
          D: "dative",
          A: "accusative",
          V: "vocative",
          "1": "first",
          "2": "second",
          "3": "third",
        } as Record<string, string>
      )[tail[0]],
    );
    add(({ S: "singular", P: "plural" } as Record<string, string>)[tail[1]]);
    add(
      (
        { M: "masculine", F: "feminine", N: "neuter" } as Record<string, string>
      )[tail[2]],
    );
  }
  return [...new Set(words)].join(" · ");
}
