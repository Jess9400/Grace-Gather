import type { Language } from "./content";
import { prayerCopy } from "./journal-prayer-copy";
const text = {
  // The saved entry page: your letter, then a verse and one small step.
  wordForYou: [
    "A word for you",
    "Uma palavra para você",
    "Una palabra para ti",
    "Слово для вас",
  ],
  smallStep: [
    "A small step",
    "Um pequeno passo",
    "Un pequeño paso",
    "Маленький шаг",
  ],
  editLetter: ["Edit", "Editar", "Editar", "Изменить"],
  editLetterLabel: [
    "Edit what I wrote",
    "Editar o que escrevi",
    "Editar lo que escribí",
    "Изменить то, что я написал(а)",
  ],
  readAll: ["Read all", "Ler tudo", "Leer todo", "Читать полностью"],
  showLess: ["Show less", "Mostrar menos", "Mostrar menos", "Свернуть"],
  hopeIntro: [
    "When hope feels far away, it may help to notice one small moment of care or relief from the past 24 hours. It doesn’t have to make everything feel better.",
    "Quando a esperança parece distante, talvez ajude lembrar um pequeno momento de cuidado ou alívio nas últimas 24 horas. Isso não precisa resolver tudo.",
    "Cuando la esperanza parece lejana, quizá ayude recordar un pequeño momento de cuidado o alivio en las últimas 24 horas. No tiene que arreglarlo todo.",
    "Когда надежда кажется далёкой, попробуйте вспомнить небольшой момент заботы или облегчения за последние сутки. Это не обязано сразу всё исправить.",
  ],
  hopeAction: [
    "Notice one small good thing",
    "Lembrar algo bom",
    "Recordar algo bueno",
    "Вспомнить что-то доброе",
  ],
  hopeNote: [
    "Was there a kind word, a meal, or a moment of rest? Write about one thing, however small. If nothing comes to mind, you can simply write what you need today.",
    "Houve uma palavra gentil, uma refeição ou um momento de descanso? Escreva sobre algo, por menor que seja. Se nada vier à mente, escreva o que precisa hoje.",
    "¿Hubo una palabra amable, una comida o un momento de descanso? Escribe sobre algo, por pequeño que sea. Si no recuerdas nada, escribe lo que necesitas hoy.",
    "Было ли доброе слово, еда или минута отдыха? Напишите об одной мелочи. Если ничего не вспоминается, можно написать о том, что вам нужно сегодня.",
  ],
  curated: [
    "Curated guidance · AI not used",
    "Orientação selecionada · Sem IA",
    "Orientación seleccionada · Sin IA",
    "Подборка · Без ИИ",
  ],
  aiSetting: [
    "Journal guidance",
    "Orientação no diário",
    "Orientación del diario",
    "Подсказки для дневника",
  ],
  aiSettingInfo: [
    "Allow AI to use your submitted writing to suggest a verse and an action. Text and your preferences are processed by Alibaba Qwen. Recordings are sent only when you tap Transcribe.",
    "Permita que a IA use seu texto enviado para sugerir um versículo e uma ação. O texto e suas preferências são processados pelo Alibaba Qwen. Gravações só são enviadas ao tocar em Transcrever.",
    "Permite que la IA use tu texto enviado para sugerir un versículo y una acción. Alibaba Qwen procesa el texto y tus preferencias. Las grabaciones solo se envían al pulsar Transcribir.",
    "Разрешите ИИ использовать отправленную запись, чтобы предложить стих и действие. Текст и настройки обрабатывает Alibaba Qwen. Аудио отправляется только при нажатии «Расшифровать».",
  ],
  aiDefaultInfo: [
    "AI guidance starts on. When you submit, Alibaba Qwen processes your writing and preferences to suggest a verse and an action. You can turn it off here or in Preferences.",
    "A orientação por IA começa ativada. Ao enviar, o Alibaba Qwen processa seu texto e suas preferências para sugerir um versículo e uma ação. Você pode desativá-la aqui ou nas Preferências.",
    "La orientación con IA comienza activada. Al enviar, Alibaba Qwen procesa tu texto y tus preferencias para sugerir un versículo y una acción. Puedes desactivarla aquí o en Preferencias.",
    "Подсказки ИИ включены по умолчанию. При отправке Alibaba Qwen обрабатывает запись и настройки, чтобы предложить стих и действие. Их можно отключить здесь или в настройках.",
  ],
  aiPrivacy: [
    "Privacy details",
    "Detalhes de privacidade",
    "Detalles de privacidad",
    "Подробнее о конфиденциальности",
  ],
  aiEnable: [
    "Enable AI guidance",
    "Ativar orientação por IA",
    "Activar orientación con IA",
    "Включить подсказки ИИ",
  ],
  aiEnabled: [
    "AI guidance enabled",
    "Orientação por IA ativada",
    "Orientación con IA activada",
    "Подсказки ИИ включены",
  ],
  heading: [
    "Perhaps this could help today.",
    "Talvez isto ajude hoje.",
    "Quizá esto te ayude hoy.",
    "Возможно, сегодня это поможет.",
  ],
  open: [
    "Take a moment",
    "Reserve um momento",
    "Tómate un momento",
    "Уделить минуту",
  ],
  close: ["Close", "Fechar", "Cerrar", "Закрыть"],
  save: [
    "Save privately",
    "Salvar em privado",
    "Guardar en privado",
    "Сохранить лично",
  ],
  saved: [
    "Saved to your journal.",
    "Salvo no seu diário.",
    "Guardado en tu diario.",
    "Сохранено в дневнике.",
  ],
  weekly: [
    "How have things been this week?",
    "Como você tem passado esta semana?",
    "¿Cómo te ha ido esta semana?",
    "Как прошла ваша неделя?",
  ],
  weeklyIntro: [
    "A moment to reflect, without a checklist.",
    "Um momento para refletir, sem lista de tarefas.",
    "Un momento para reflexionar, sin lista de tareas.",
    "Время для размышлений, без списка задач.",
  ],
  reflect: [
    "Talk to God",
    "Falar com Deus",
    "Hablar con Dios",
    "Поговорить с Богом",
  ],
  later: [
    "Not this week",
    "Não nesta semana",
    "Esta semana no",
    "Не на этой неделе",
  ],
  pay: ["Pay it forward", "Fazer o bem", "Compartir el bien", "Передать добро"],
  A01: [
    "Light a candle in their memory",
    "Acenda uma vela em sua memória",
    "Enciende una vela en su memoria",
    "Зажгите свечу в память",
  ],
  A02: [
    "Remember them in prayer",
    "Lembre-se dessa pessoa em oração",
    "Recuerda a esa persona en oración",
    "Вспомните этого человека в молитве",
  ],
  A03: [
    "Take a minute with God",
    "Reserve um minuto com Deus",
    "Tómate un minuto con Dios",
    "Уделить минуту Богу",
  ],
  backToJournal: [
    "Back to journal",
    "Voltar ao diário",
    "Volver al diario",
    "Вернуться к дневнику",
  ],
  A04: [
    "Share what is on your heart",
    "Compartilhe o que está no seu coração",
    "Comparte lo que hay en tu corazón",
    "Поделитесь тем, что на сердце",
  ],
  A05: [
    "Reach out for professional support",
    "Busque apoio profissional",
    "Busca apoyo profesional",
    "Обратитесь за профессиональной поддержкой",
  ],
  A07: [
    "Reach out to someone you trust",
    "Fale com alguém de confiança",
    "Habla con alguien de confianza",
    "Свяжитесь с тем, кому доверяете",
  ],
  A08: [
    "Put one thought into words",
    "Coloque um pensamento em palavras",
    "Pon un pensamiento en palabras",
    "Выразите одну мысль словами",
  ],
  A09: [
    "Take a quiet pause",
    "Faça uma pausa tranquila",
    "Haz una pausa tranquila",
    "Сделайте спокойную паузу",
  ],
  A10: [
    "Draft an apology privately",
    "Escreva um pedido de desculpas em privado",
    "Escribe una disculpa en privado",
    "Напишите извинение для себя",
  ],
  A11: [
    "Send someone a kind note",
    "Envie uma mensagem gentil",
    "Envía un mensaje amable",
    "Напишите кому-нибудь добрые слова",
  ],
  A12: [
    "Thank someone for their kindness",
    "Agradeça a alguém pela gentileza",
    "Agradece a alguien su bondad",
    "Поблагодарите за доброту",
  ],
  A14: [
    "Offer comfort to someone",
    "Ofereça conforto a alguém",
    "Ofrece consuelo a alguien",
    "Поддержать другого человека",
  ],
  A27: [
    "Create a gathering",
    "Crie um encontro",
    "Crea un encuentro",
    "Создать встречу",
  ],
  A15: [
    "Request a prayer",
    "Peça uma oração",
    "Pide una oración",
    "Попросите помолиться",
  ],
  A16: [
    "Pray for someone else",
    "Ore por outra pessoa",
    "Ora por otra persona",
    "Помолитесь за другого",
  ],
  A18: [
    "Find a way to give back",
    "Encontre uma forma de ajudar",
    "Encuentra una forma de ayudar",
    "Найдите способ помочь",
  ],
  A19: [
    "Read a story of hope",
    "Leia uma história de esperança",
    "Lee una historia de esperanza",
    "Прочитайте историю надежды",
  ],
  A20: [
    "Share your testimony",
    "Compartilhe seu testemunho",
    "Comparte tu testimonio",
    "Поделитесь свидетельством",
  ],
  A21: [
    "Light a candle in prayer",
    "Acenda uma vela em oração",
    "Enciende una vela en oración",
    "Зажгите свечу с молитвой",
  ],
  A26: [
    "Explore your question in Bible Study",
    "Explore sua pergunta no Estudo Bíblico",
    "Explora tu pregunta en el Estudio Bíblico",
    "Изучите свой вопрос в Библии",
  ],
  A25: [
    "Explore gatherings",
    "Explorar encontros",
    "Explorar encuentros",
    "Посмотреть встречи",
  ],
  note: [
    "You can write a few words here, or simply sit with this quietly.",
    "Você pode escrever algumas palavras ou ficar em silêncio.",
    "Puedes escribir unas palabras o quedarte en silencio.",
    "Можно написать несколько слов или просто побыть в тишине.",
  ],
  professional: [
    "Consider contacting a qualified mental health professional or your doctor. You can note whom you would like to contact here.",
    "Considere falar com um profissional de saúde mental ou seu médico. Anote aqui quem gostaria de procurar.",
    "Considera hablar con un profesional de salud mental o tu médico. Anota aquí a quién te gustaría contactar.",
    "Подумайте об обращении к специалисту по психическому здоровью или врачу. Здесь можно записать, с кем связаться.",
  ],
  private: [
    "This stays in your journal. Nothing is sent to anyone.",
    "Isto fica no seu diário. Nada é enviado a ninguém.",
    "Esto queda en tu diario. No se envía nada a nadie.",
    "Это останется в дневнике. Ничего не отправляется другим.",
  ],
  fallback: [
    "A reflection chosen from our curated collection.",
    "Uma reflexão da nossa coleção selecionada.",
    "Una reflexión de nuestra colección seleccionada.",
    "Размышление из нашей подборки.",
  ],
};
export function jc(lang: Language, key: keyof typeof text) {
  return text[key][{ en: 0, pt: 1, es: 2, ru: 3 }[lang]];
}
export type JournalCopyKey = keyof typeof text;

export function journalActionCopy(
  lang: Language,
  theme: string,
  action: string,
) {
  const specific: Record<string, string[]> = {
    "lonely:A25": ["Being with others might help you feel connected.", "Estar com outras pessoas pode ajudar você a se sentir conectado.", "Estar con otras personas puede ayudarte a sentirte acompañado.", "Встреча с другими может помочь почувствовать связь."],
    "homesick:A25": ["A gathering may be a gentle way to find connection.", "Um encontro pode ser uma forma acolhedora de encontrar companhia.", "Un encuentro puede ser una manera amable de encontrar compañía.", "Встреча может стать бережным шагом к общению."],
    "listen:A14": ["Your wish to listen could offer someone comfort.", "Sua vontade de escutar pode levar conforto a alguém.", "Tus ganas de escuchar pueden dar consuelo a alguien.", "Ваше желание выслушать может кого-то поддержать."],
    "service:A18": ["If you would like to give back, explore a cause that matters to you.", "Se quiser retribuir, encontre uma causa importante para você.", "Si quieres devolver algo, descubre una causa importante para ti.", "Если хотите помочь, найдите важное для вас дело."],
  };
  if (specific[`${theme}:${action}`])
    return { title: jc(lang, action as JournalCopyKey), invitation: specific[`${theme}:${action}`][{ en: 0, pt: 1, es: 2, ru: 3 }[lang]], prompt: jc(lang, "note") };
  if (action === "A04") {
    const invitations = [
      "If you’d like someone to listen, the Confession room is a place to share what’s weighing on you. A listener may respond with care.",
      "Se quiser que alguém escute, a sala de Confissão é um espaço para compartilhar o que pesa no seu coração. Uma pessoa pode responder com carinho.",
      "Si te gustaría que alguien te escuche, la sala de Confesión es un lugar para compartir lo que pesa en tu corazón. Una persona puede responder con cariño.",
      "Если хочется, чтобы вас выслушали, в комнате исповеди можно поделиться тем, что лежит на сердце. Другой человек может ответить с заботой.",
    ];
    return { title: jc(lang, "A04"), invitation: invitations[{ en: 0, pt: 1, es: 2, ru: 3 }[lang]], prompt: jc(lang, "note") };
  }
  if (action === "A03") {
    const prayer = prayerCopy(lang, theme);
    if (prayer) return prayer;
  }
  if (theme === "hopelessness" && action === "A08")
    return {
      title: jc(lang, "hopeAction"),
      invitation: jc(lang, "hopeIntro"),
      prompt: jc(lang, "hopeNote"),
    };
  return {
    title: jc(lang, action as JournalCopyKey),
    invitation: actionInvitation(lang, action),
    prompt: jc(lang, action === "A05" ? "professional" : "note"),
  };
}

// An invitation from the app, never generated speech attributed to God.
export function actionInvitation(lang: Language, action: string) {
  const invitations: Record<string, string[]> = {
    remember: [
      "You might find comfort in a moment of remembrance.",
      "Talvez um momento de lembrança traga conforto.",
      "Quizá encuentres consuelo en un momento para recordar.",
      "Возможно, воспоминание принесёт немного утешения.",
    ],
    prayer: [
      "You can bring this to God, just as you are.",
      "Você pode levar isso a Deus, do jeito que está.",
      "Puedes llevar esto a Dios, tal como estás.",
      "Можно принести это Богу, таким, какой вы есть.",
    ],
    connection: [
      "You don’t have to carry this alone.",
      "Você não precisa carregar isso sozinho.",
      "No tienes que llevar esto a solas.",
      "Вам не нужно нести это в одиночку.",
    ],
    pause: [
      "You don’t have to work everything out right now.",
      "Você não precisa resolver tudo agora.",
      "No tienes que resolverlo todo ahora.",
      "Не обязательно разбираться со всем прямо сейчас.",
    ],
    thanks: [
      "Would you like to let them know what their kindness meant to you?",
      "Que tal contar a essa pessoa o quanto sua gentileza significou para você?",
      "¿Te gustaría contarle cuánto significó para ti su amabilidad?",
      "Хотите рассказать этому человеку, как много значила для вас его доброта?",
    ],
    kindness: [
      "Perhaps a small act of kindness would feel meaningful today.",
      "Talvez um pequeno gesto de bondade faça sentido hoje.",
      "Quizá un pequeño gesto de bondad tenga sentido hoy.",
      "Возможно, небольшой добрый поступок будет важен для вас сегодня.",
    ],
    apology: [
      "If you feel ready, you could begin with a few honest words.",
      "Se sentir que é a hora, comece com algumas palavras sinceras.",
      "Si te sientes preparado, podrías empezar con unas palabras sinceras.",
      "Если вы готовы, можно начать с нескольких искренних слов.",
    ],
    explore: [
      "There is room to explore what is on your heart.",
      "Há espaço para explorar o que está no seu coração.",
      "Hay espacio para explorar lo que hay en tu corazón.",
      "Есть место, чтобы исследовать то, что у вас на сердце.",
    ],
  };
  const groups: Record<string, string> = {
    A01: "remember",
    A02: "remember",
    A03: "prayer",
    A04: "connection",
    A05: "connection",
    A07: "connection",
    A08: "pause",
    A09: "pause",
    A10: "apology",
    A11: "kindness",
    A12: "thanks",
    A14: "kindness",
    A25: "connection",
    A27: "kindness",
    A15: "connection",
    A16: "prayer",
    A18: "kindness",
    A19: "explore",
    A20: "explore",
    A21: "prayer",
    A26: "explore",
  };
  return (
    invitations[groups[action]]?.[{ en: 0, pt: 1, es: 2, ru: 3 }[lang]] ??
    jc(lang, "heading")
  );
}

// Update the old generic invitation only for display; preserve saved journal data
// and any individually written invitation intact.
export function displayedJournalInvitation(lang: Language, theme: string, action: string, saved?: string) {
  const legacy = actionInvitation(lang, "A04");
  if (action === "A04" && (!saved || saved === legacy))
    return journalActionCopy(lang, theme, action).invitation;
  return saved ?? journalActionCopy(lang, theme, action).invitation;
}
