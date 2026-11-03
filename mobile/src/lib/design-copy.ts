import type { Language } from "./content";

// Short interface copy, ordered English / Portuguese / Spanish / Russian.
const words = {
  findScripture: [
    "Find Scripture",
    "Encontrar passagens",
    "Encontrar pasajes",
    "Найти слова Писания",
  ],
  voiceNote: [
    "Add a voice note",
    "Adicionar áudio",
    "Añadir una nota de voz",
    "Добавить голосовую запись",
  ],
  aboutSpace: [
    "About this space",
    "Sobre este espaço",
    "Sobre este espacio",
    "Об этом пространстве",
  ],
  peerSupport: [
    "Community support · Not sacramental confession",
    "Apoio da comunidade · Não é confissão sacramental",
    "Apoyo comunitario · No es confesión sacramental",
    "Поддержка сообщества · Не таинство исповеди",
  ],
  confessionIntro: [
    "Bring what’s weighing on your heart.",
    "Traga o que pesa no seu coração.",
    "Trae lo que pesa en tu corazón.",
    "Поделитесь тем, что тяготит ваше сердце.",
  ],
  shareHint: [
    "Be heard anonymously.",
    "Seja ouvido de forma anônima.",
    "Encuentra escucha de forma anónima.",
    "Поделитесь анонимно.",
  ],
  comfortHint: [
    "Respond with kindness.",
    "Responda com carinho.",
    "Responde con cariño.",
    "Ответьте с добротой.",
  ],
  audienceSummary: [
    "Anonymous to community listeners · One response",
    "Anônimo para ouvintes da comunidade · Uma resposta",
    "Anónimo para oyentes de la comunidad · Una respuesta",
    "Анонимно для слушателей сообщества · Один ответ",
  ],
  communityTools: [
    "Community tools",
    "Ferramentas da comunidade",
    "Herramientas de la comunidad",
    "Инструменты сообщества",
  ],
  studyIntro: [
    "Free courses for faith and everyday life.",
    "Cursos gratuitos para a fé e o dia a dia.",
    "Cursos gratuitos para la fe y la vida diaria.",
    "Бесплатные курсы о вере и повседневной жизни.",
  ],
  scriptureStudy: [
    "Scripture & theology",
    "Bíblia e teologia",
    "Biblia y teología",
    "Писание и богословие",
  ],
  dailyPractices: [
    "Practices for everyday life",
    "Práticas para o dia a dia",
    "Prácticas para la vida diaria",
    "Практики на каждый день",
  ],
  comingSoon: ["IN THE MAKING", "EM PREPARAÇÃO", "EN PREPARACIÓN", "ГОТОВИТСЯ"],
  gatheringIntro: [
    "A little time together.",
    "Um tempo para estar juntos.",
    "Un tiempo para estar juntos.",
    "Немного времени вместе.",
  ],
  plannedTitle: [
    "Thursday conversations",
    "Conversas de quinta",
    "Conversaciones de los jueves",
    "Беседы по четвергам",
  ],
  plannedSummary: [
    "A weekly space to talk about loneliness and depression, with someone to listen.",
    "Um espaço semanal para conversar sobre solidão e depressão, com alguém para ouvir.",
    "Un espacio semanal para hablar de soledad y depresión, con alguien que escuche.",
    "Еженедельные встречи о депрессии и одиночестве, где вас готовы выслушать.",
  ],
  plannedDate: [
    "Proposed for Thursdays. Host, time and start date to be confirmed.",
    "Proposta para quintas-feiras. Facilitador, horário e início a confirmar.",
    "Propuestas para los jueves. Anfitrión, hora e inicio por confirmar.",
    "Предлагаемый день — четверг. Ведущий, время и дата начала уточняются.",
  ],
  sessionDetails: [
    "About the gatherings",
    "Sobre os encontros",
    "Sobre los encuentros",
    "О встречах",
  ],
  calendar: [
    "Browse the calendar",
    "Ver calendário",
    "Ver calendario",
    "Посмотреть календарь",
  ],
  clearDate: [
    "Show all dates",
    "Mostrar todas as datas",
    "Mostrar todas las fechas",
    "Показать все даты",
  ],
  nextGatherings: [
    "Upcoming gatherings",
    "Próximos encontros",
    "Próximos encuentros",
    "Ближайшие встречи",
  ],
  noResults: [
    "No matches. Try another theme.",
    "Nenhum resultado. Tente outro tema.",
    "Sin resultados. Prueba otro tema.",
    "Ничего не найдено. Попробуйте другую тему.",
  ],
} as const;
export function designCopy(
  language: Language,
  key: keyof typeof words,
): string {
  return words[key][({ en: 0, pt: 1, es: 2, ru: 3 } as const)[language]];
}
