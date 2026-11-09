import type { Language } from "./content";

// A03 is one action, not one instruction for every feeling. Adapted from the
// Theme Map's private-option column (I), rows 9, 14, 20, 28, 31 and 32:
// https://docs.google.com/spreadsheets/d/1cwIdBMhVmPhZwRlxCLi9YPjkJT30DybaZmlgqsl3pSA/edit#gid=229849854
// Each row is [short button, invitation, prompt inside the private action].
type PrayerWords = [string, string, string];
const words: Record<string, Record<Language, PrayerWords>> = {
  doubt: {
    en: [
      "Begin an honest prayer",
      "When God feels far away, you don’t need perfect words. You could start by naming the distance you feel.",
      "Start a prayer with one honest sentence about the distance you feel. You can write it here or pray quietly.",
    ],
    pt: [
      "Começar uma oração sincera",
      "Quando Deus parece distante, você não precisa de palavras perfeitas. Pode começar falando dessa distância.",
      "Comece uma oração com uma frase sincera sobre a distância que sente. Pode escrever aqui ou orar em silêncio.",
    ],
    es: [
      "Comenzar una oración sincera",
      "Cuando Dios parece lejano, no necesitas palabras perfectas. Puedes empezar hablando de esa distancia.",
      "Empieza una oración con una frase sincera sobre la distancia que sientes. Puedes escribirla aquí u orar en silencio.",
    ],
    ru: [
      "Начать искреннюю молитву",
      "Когда Бог кажется далёким, не нужны идеальные слова. Можно начать с того, что вы чувствуете эту отдалённость.",
      "Начните молитву с одной искренней фразы о том, как далеко от Бога вы себя чувствуете. Можно написать её здесь или помолиться в тишине.",
    ],
  },
  anxiety: {
    en: [
      "Bring this worry to prayer",
      "You don’t have to put every worry into words at once. Perhaps start with the one that feels heaviest.",
      "Name one worry in a short prayer. You can write it here or pray quietly.",
    ],
    pt: [
      "Levar esta preocupação à oração",
      "Você não precisa colocar todas as preocupações em palavras de uma vez. Talvez comece pela que mais pesa.",
      "Dê nome a uma preocupação em uma oração breve. Pode escrever aqui ou orar em silêncio.",
    ],
    es: [
      "Llevar esta preocupación a la oración",
      "No tienes que poner todas tus preocupaciones en palabras a la vez. Quizá puedas empezar por la que más pesa.",
      "Nombra una preocupación en una oración breve. Puedes escribirla aquí u orar en silencio.",
    ],
    ru: [
      "Доверить эту тревогу в молитве",
      "Не обязательно сразу находить слова для всех тревог. Можно начать с той, что сейчас тяжелее всего.",
      "Назовите одну тревогу в короткой молитве. Можно написать её здесь или помолиться в тишине.",
    ],
  },
  sadness: {
    en: [
      "Pray with what feels hardest",
      "There is room for sadness in prayer. You could tell God what feels hardest today, without trying to make it sound hopeful.",
      "Take one minute to tell God what feels hardest today. Write a few words here, or pray quietly.",
    ],
    pt: [
      "Orar sobre o que mais pesa",
      "Há espaço para a tristeza na oração. Você pode contar a Deus o que está mais difícil hoje, sem tentar parecer esperançoso.",
      "Reserve um minuto para contar a Deus o que está mais difícil hoje. Escreva algumas palavras aqui ou ore em silêncio.",
    ],
    es: [
      "Orar sobre lo que más pesa",
      "Hay lugar para la tristeza en la oración. Puedes contarle a Dios qué cuesta más hoy, sin intentar sonar esperanzado.",
      "Tómate un minuto para contarle a Dios qué cuesta más hoy. Escribe unas palabras aquí u ora en silencio.",
    ],
    ru: [
      "Помолиться о том, что тяжелее всего",
      "В молитве есть место печали. Можно рассказать Богу, что сегодня труднее всего, не пытаясь звучать обнадёживающе.",
      "Уделите минуту, чтобы рассказать Богу, что сегодня труднее всего. Напишите несколько слов или помолитесь в тишине.",
    ],
  },
  illness: {
    en: [
      "Pray for care and strength",
      "Waiting and uncertainty can be hard. You could take a quiet minute to bring this need for care to God.",
      "Name the person who is unwell, yourself or someone else, and what you hope for them today. Write it here or pray quietly.",
    ],
    pt: [
      "Orar por cuidado e força",
      "A espera e a incerteza podem ser difíceis. Você pode reservar um minuto para levar a Deus essa necessidade de cuidado.",
      "Diga o nome de quem está doente, você ou outra pessoa, e o que deseja para hoje. Escreva aqui ou ore em silêncio.",
    ],
    es: [
      "Orar por cuidado y fortaleza",
      "La espera y la incertidumbre pueden ser difíciles. Puedes dedicar un minuto a llevar a Dios esta necesidad de cuidado.",
      "Nombra a quien está enfermo, tú u otra persona, y lo que deseas para hoy. Escríbelo aquí u ora en silencio.",
    ],
    ru: [
      "Помолиться о заботе и силах",
      "Ожидание и неизвестность бывают тяжёлыми. Можно уделить минуту и принести Богу эту нужду в заботе.",
      "Назовите того, кто болеет, себя или другого человека, и то, чего желаете сегодня. Напишите здесь или помолитесь в тишине.",
    ],
  },
  betrayal: {
    en: [
      "Bring this hurt to prayer",
      "You don’t have to rush past what hurt you. You could begin by telling God what felt most painful.",
      "Take one minute to tell God what hurt most. You do not need to resolve it or decide about forgiveness now.",
    ],
    pt: [
      "Levar esta dor à oração",
      "Você não precisa superar a dor às pressas. Pode começar contando a Deus o que mais machucou.",
      "Reserve um minuto para contar a Deus o que mais machucou. Não precisa resolver isso nem decidir sobre o perdão agora.",
    ],
    es: [
      "Llevar este dolor a la oración",
      "No tienes que apresurarte a superar lo que te hirió. Puedes empezar contándole a Dios qué dolió más.",
      "Tómate un minuto para contarle a Dios qué dolió más. No necesitas resolverlo ni decidir sobre el perdón ahora.",
    ],
    ru: [
      "Принести эту боль в молитву",
      "Не нужно торопиться оставить боль позади. Можно начать с рассказа Богу о том, что ранило сильнее всего.",
      "Уделите минуту, чтобы рассказать Богу, что причинило самую сильную боль. Не обязательно сейчас всё разрешать или решать вопрос прощения.",
    ],
  },
  hopelessness: {
    en: [
      "Pray with how heavy this feels",
      "You don’t need to find a hopeful answer before you pray. You could simply name how heavy today feels.",
      "Take one minute to tell God how heavy this feels. You can write a few words or remain quietly in prayer.",
    ],
    pt: [
      "Orar sobre o peso de hoje",
      "Você não precisa encontrar uma resposta esperançosa antes de orar. Pode simplesmente dizer o quanto hoje está pesado.",
      "Reserve um minuto para contar a Deus o peso que sente. Pode escrever algumas palavras ou ficar em oração silenciosa.",
    ],
    es: [
      "Orar sobre el peso de hoy",
      "No necesitas encontrar una respuesta esperanzadora antes de orar. Puedes decir sencillamente cuánto pesa el día de hoy.",
      "Tómate un minuto para contarle a Dios cuánto pesa esto. Puedes escribir unas palabras o permanecer en oración silenciosa.",
    ],
    ru: [
      "Помолиться о тяжести этого дня",
      "Не нужно находить обнадёживающий ответ, прежде чем молиться. Можно просто назвать, как тяжело вам сегодня.",
      "Уделите минуту, чтобы рассказать Богу, как это тяжело. Можно написать несколько слов или побыть в тихой молитве.",
    ],
  },
};

export function prayerCopy(lang: Language, theme: string) {
  const row = words[theme === "venting" ? "sadness" : theme]?.[lang];
  return row ? { title: row[0], invitation: row[1], prompt: row[2] } : null;
}
