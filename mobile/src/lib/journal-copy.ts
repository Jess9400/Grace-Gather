import { traditionWording } from "./tradition-wording";
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
    "Изменить написанное",
  ],
  readAll: ["Read all", "Ler tudo", "Leer todo", "Читать полностью"],
  showLess: ["Show less", "Mostrar menos", "Mostrar menos", "Свернуть"],
  hopeIntro: [
    "When hope feels far away, it may help to notice one small moment of care or relief from the past 24 hours. It doesn’t have to make everything feel better.",
    "Quando a esperança parece distante, talvez ajude lembrar um pequeno momento de cuidado ou alívio nas últimas 24 horas. Isso não precisa resolver tudo.",
    "Cuando la esperanza parece lejana, quizá ayude recordar un pequeño momento de cuidado o alivio en las últimas 24 horas. No tiene que arreglarlo todo.",
    "Когда надежда кажется далёкой, попробуйте вспомнить хотя бы одну минуту за последние сутки, когда о вас позаботились или вам стало чуть легче. Не нужно ждать, что от этого всё сразу наладится.",
  ],
  hopeAction: [
    "Notice one small good thing",
    "Lembrar algo bom",
    "Recordar algo bueno",
    "Вспомнить что-то доброе",
  ],
  hopeNote: [
    "Was there a kind word, a meal, or a moment of rest? Write about one thing, however small. If nothing comes to mind, you can write what you need today.",
    "Houve uma palavra gentil, uma refeição ou um momento de descanso? Escreva sobre algo, por menor que seja. Se nada vier à mente, você pode escrever o que precisa hoje.",
    "¿Hubo una palabra amable, una comida o un momento de descanso? Escribe sobre algo, por pequeño que sea. Si no recuerdas nada, puedes escribir lo que necesitas hoy.",
    "Может быть, кто-то сказал вам доброе слово, вы спокойно поели или удалось немного отдохнуть? Напишите о чём-то одном, пусть даже совсем небольшом. Если ничего не вспоминается, можно написать, что вам нужно сегодня.",
  ],
  curated: [
    "Curated guidance · AI not used",
    "Orientação selecionada · Sem IA",
    "Orientación seleccionada · Sin IA",
    "Из нашей подборки · Без ИИ",
  ],
  aiSetting: [
    "Personal AI guidance",
    "Orientação pessoal por IA",
    "Orientación personal con IA",
    "Личные подсказки ИИ",
  ],
  aiSettingInfo: [
    "With your permission, your journal, Bible questions and preferences are sent through Supabase to our AI provider, Alibaba Cloud. See Privacy & support for details.",
    "Com sua permissão, seu diário, perguntas bíblicas e preferências são enviados pelo Supabase ao nosso provedor de IA, Alibaba Cloud. Saiba mais em Privacidade e suporte.",
    "Con tu permiso, tu diario, preguntas bíblicas y preferencias se envían mediante Supabase a nuestro proveedor de IA, Alibaba Cloud. Más información en Privacidad y ayuda.",
    "С вашего разрешения дневник, вопросы о Библии и настройки отправляются через Supabase нашему провайдеру ИИ Alibaba Cloud. Подробнее — в разделе конфиденциальности.",
  ],
  // The one line shown beside the choice. It still says who receives the
  // writing; the full disclosure opens under "Privacy details".
  aiShort: [
    "AI suggests a verse and a small step that fit what you write. Optional: if you agree, your writing goes to our AI provider, Alibaba Cloud.",
    "A IA sugere um versículo e um pequeno passo para o que você escreve. Opcional: se você concordar, seu texto vai para nosso provedor de IA, Alibaba Cloud.",
    "La IA sugiere un versículo y un pequeño paso para lo que escribes. Opcional: si aceptas, tu texto se envía a nuestro proveedor de IA, Alibaba Cloud.",
    "ИИ подберёт стих и маленький шаг, которые подходят к тому, что вы пишете. Это необязательно: если вы согласитесь, ваши записи будут отправляться нашему провайдеру ИИ Alibaba Cloud.",
  ],
  aiPrivacy: [
    "Privacy details",
    "Detalhes de privacidade",
    "Detalles de privacidad",
    "Подробнее о конфиденциальности",
  ],
  aiEnable: [
    "I agree: use AI guidance",
    "Concordo: usar orientação por IA",
    "Acepto: usar orientación con IA",
    "Согласиться на подсказки ИИ",
  ],
  // Shown on the AI button while AI is on: the button says what tapping does.
  aiDisable: [
    "Turn off AI guidance",
    "Desativar orientação por IA",
    "Desactivar orientación con IA",
    "Отключить подсказки ИИ",
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
    "Остановиться на минуту",
  ],
  close: ["Close", "Fechar", "Cerrar", "Закрыть"],
  save: [
    "Save privately",
    "Salvar em privado",
    "Guardar en privado",
    "Сохранить только для себя",
  ],
  saved: [
    "Saved to your journal.",
    "Salvo no seu diário.",
    "Guardado en tu diario.",
    "Сохранено в дневнике.",
  ],
  weekly: [
    "A moment to reflect",
    "Um momento para refletir",
    "Un momento para reflexionar",
    "Минута для размышления",
  ],
  weeklyIntro: [
    "Would you like to reflect on the step you chose?",
    "Gostaria de refletir sobre o passo que escolheu?",
    "¿Te gustaría reflexionar sobre el paso que elegiste?",
    "Хотите подумать о выбранном шаге?",
  ],
  reflect: [
    "Talk to God",
    "Falar com Deus",
    "Hablar con Dios",
    "Поговорить с Богом",
  ],
  later: ["Not now", "Agora não", "Ahora no", "Не сейчас"],
  pay: ["Pay it forward", "Fazer o bem", "Compartir el bien", "Добрые дела"],
  A01: [
    "Light a candle in their memory",
    "Acenda uma vela em sua memória",
    "Enciende una vela en su memoria",
    "Зажечь свечу в память о близком",
  ],
  A02: [
    "Remember them in prayer",
    "Lembre-se dessa pessoa em oração",
    "Recuerda a esa persona en oración",
    "Помянуть в молитве",
  ],
  A03: [
    "Take a minute with God",
    "Reserve um minuto com Deus",
    "Tómate un minuto con Dios",
    "Побыть минуту с Богом",
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
    "Поделиться тем, что на сердце",
  ],
  A05: [
    "Reach out for professional support",
    "Busque apoio profissional",
    "Busca apoyo profesional",
    "Обратиться к специалисту",
  ],
  A07: [
    "Reach out to someone you trust",
    "Fale com alguém de confiança",
    "Habla con alguien de confianza",
    "Поговорить с тем, кому доверяете",
  ],
  A08: [
    "Put one thought into words",
    "Coloque um pensamento em palavras",
    "Pon un pensamiento en palabras",
    "Записать одну мысль",
  ],
  A09: [
    "Take a quiet pause",
    "Faça uma pausa tranquila",
    "Haz una pausa tranquila",
    "Побыть в тишине",
  ],
  A10: [
    "Draft an apology privately",
    "Escreva um pedido de desculpas em privado",
    "Escribe una disculpa en privado",
    "Написать извинение — пока для себя",
  ],
  A11: [
    "Send someone a kind note",
    "Envie uma mensagem gentil",
    "Envía un mensaje amable",
    "Написать кому-нибудь добрые слова",
  ],
  A12: [
    "Thank someone for their kindness",
    "Agradeça a alguém pela gentileza",
    "Agradece a alguien su bondad",
    "Поблагодарить за доброту",
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
    "Попросить о молитве",
  ],
  A16: [
    "Pray for someone else",
    "Ore por outra pessoa",
    "Ora por otra persona",
    "Помолиться за другого человека",
  ],
  A18: [
    "Find a way to give back",
    "Encontre uma forma de ajudar",
    "Encuentra una forma de ayudar",
    "Найти способ помочь",
  ],
  A19: [
    "Read a story of hope",
    "Leia uma história de esperança",
    "Lee una historia de esperanza",
    "Прочитать историю о надежде",
  ],
  A20: [
    "Share your testimony",
    "Compartilhe seu testemunho",
    "Comparte tu testimonio",
    "Поделиться свидетельством",
  ],
  A21: [
    "Light a candle in prayer",
    "Acenda uma vela em oração",
    "Enciende una vela en oración",
    "Зажечь свечу с молитвой",
  ],
  A26: [
    "Explore your question in Bible Study",
    "Explore sua pergunta no Estudo Bíblico",
    "Explora tu pregunta en el Estudio Bíblico",
    "Поискать ответ в Библии",
  ],
  A25: [
    "Explore gatherings",
    "Explorar encontros",
    "Explorar encuentros",
    "Посмотреть встречи",
  ],
  note: [
    "You can write a few words, or simply sit with this quietly.",
    "Você pode escrever algumas palavras ou simplesmente ficar em silêncio.",
    "Puedes escribir unas palabras o simplemente quedarte en silencio.",
    "Можно написать несколько слов или просто побыть в тишине.",
  ],
  professional: [
    "Consider contacting a qualified mental health professional or your doctor. You can note whom you would like to contact here.",
    "Considere falar com um profissional de saúde mental ou seu médico. Anote aqui quem gostaria de procurar.",
    "Considera hablar con un profesional de salud mental o tu médico. Anota aquí a quién te gustaría contactar.",
    "Возможно, стоит поговорить со специалистом по психическому здоровью или со своим врачом. Здесь можно записать, к кому вы хотели бы обратиться.",
  ],
  private: [
    "This stays in your journal and isn’t sent to anyone.",
    "Isto fica no seu diário e não é enviado a ninguém.",
    "Esto queda en tu diario y no se envía a nadie.",
    "Это останется в вашем дневнике и никому не будет отправлено.",
  ],
  fallback: [
    "A reflection chosen from our curated collection.",
    "Uma reflexão da nossa coleção selecionada.",
    "Una reflexión de nuestra colección seleccionada.",
    "Размышление из нашей подборки.",
  ],
};
export function jc(lang: Language, key: keyof typeof text) {
  return traditionWording(text[key][{ en: 0, pt: 1, es: 2, ru: 3 }[lang]]);
}
export type JournalCopyKey = keyof typeof text;

export function journalActionCopy(
  lang: Language,
  theme: string,
  action: string,
) {
  const specific: Record<string, string[]> = {
    "lonely:A25": [
      "Being with others might help you feel connected.",
      "Estar com outras pessoas pode ajudar você a se sentir conectado.",
      "Estar con otras personas puede ayudarte a sentirte acompañado.",
      "Встреча с другими людьми может помочь вам почувствовать, что вы не одни.",
    ],
    "homesick:A25": [
      "A gathering may be a gentle way to find connection.",
      "Um encontro pode ser uma forma acolhedora de encontrar companhia.",
      "Un encuentro puede ser una manera amable de encontrar compañía.",
      "На встрече можно спокойно побыть среди людей.",
    ],
    "listen:A14": [
      "Your wish to listen could offer someone comfort.",
      "Sua vontade de escutar pode levar conforto a alguém.",
      "Tus ganas de escuchar pueden dar consuelo a alguien.",
      "Ваше желание выслушать может кого-то поддержать.",
    ],
    "service:A18": [
      "If you would like to give back, explore a cause that matters to you.",
      "Se quiser retribuir, encontre uma causa importante para você.",
      "Si quieres devolver algo, descubre una causa importante para ti.",
      "Если хотите помочь, найдите важное для вас дело.",
    ],
  };
  if (specific[`${theme}:${action}`])
    return {
      title: jc(lang, action as JournalCopyKey),
      invitation:
        specific[`${theme}:${action}`][{ en: 0, pt: 1, es: 2, ru: 3 }[lang]],
      prompt: jc(lang, "note"),
    };
  if (action === "A04") {
    const invitations = [
      "If you’d like someone to listen, the Confession room is a place to share what’s weighing on you. A listener may respond with care.",
      "Se quiser que alguém escute, a sala de Confissão é um espaço para compartilhar o que pesa no seu coração. Uma pessoa pode responder com carinho.",
      "Si te gustaría que alguien te escuche, la sala de Confesión es un lugar para compartir lo que pesa en tu corazón. Una persona puede responder con cariño.",
      "Если хочется, чтобы вас выслушали, в комнате исповеди можно поделиться тем, что лежит на сердце. Слушатель может ответить вам словами поддержки.",
    ];
    return {
      title: jc(lang, "A04"),
      invitation: invitations[{ en: 0, pt: 1, es: 2, ru: 3 }[lang]],
      prompt: jc(lang, "note"),
    };
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
  // Localized explanations also cover entries created without AI or when a
  // suggested action changes after preference or availability checks.
  const purpose: Record<string, string[]> = {
    A01: [
      "A candle can make space to remember someone you love.",
      "Uma vela pode abrir espaço para lembrar de alguém querido.",
      "Una vela puede darte un espacio para recordar a alguien querido.",
      "Зажечь свечу — тихий способ вспомнить дорогого человека.",
    ],
    A02: [
      "A quiet prayer can be a way to remember someone you love.",
      "Uma oração tranquila pode ser uma forma de lembrar de alguém querido.",
      "Una oración tranquila puede ayudarte a recordar a alguien querido.",
      "В тихой молитве можно вспомнить близкого человека.",
    ],
    A03: [
      "A short prayer can help you bring this to God.",
      "Uma breve oração pode ajudar a levar isso a Deus.",
      "Una breve oración puede ayudarte a llevar esto ante Dios.",
      "В короткой молитве можно рассказать об этом Богу.",
    ],
    A04: [
      "The Confession room offers a place to share; a listener may respond.",
      "A sala de Confissão oferece um espaço para compartilhar; alguém pode responder.",
      "La sala de Confesión ofrece un lugar para compartir; alguien puede responder.",
      "В комнате исповеди можно поделиться сокровенным; слушатель может ответить.",
    ],
    A05: [
      "A qualified professional can offer support for what you are going through.",
      "Um profissional qualificado pode oferecer apoio para o que você está vivendo.",
      "Un profesional cualificado puede ofrecerte apoyo en lo que estás viviendo.",
      "Квалифицированный специалист может поддержать вас в том, что вы сейчас переживаете.",
    ],
    A07: [
      "Talking with someone you trust may help you feel supported.",
      "Conversar com alguém de confiança pode ajudar você a se sentir apoiado.",
      "Hablar con alguien de confianza puede ayudarte a sentirte acompañado.",
      "Разговор с тем, кому вы доверяете, может вас поддержать.",
    ],
    A08: [
      "Putting one thought into words can make room to reflect.",
      "Colocar um pensamento em palavras pode abrir espaço para refletir.",
      "Poner un pensamiento en palabras puede abrir espacio para reflexionar.",
      "Если записать хотя бы одну мысль, её будет легче обдумать.",
    ],
    A09: [
      "A quiet pause can give you a little space to breathe.",
      "Uma pausa tranquila pode dar um pouco de espaço para respirar.",
      "Una pausa tranquila puede darte un poco de espacio para respirar.",
      "Короткая пауза в тишине поможет перевести дыхание.",
    ],
    A10: [
      "Writing privately can help you find the words before deciding what to say.",
      "Escrever em particular pode ajudar a encontrar palavras antes de decidir o que dizer.",
      "Escribir en privado puede ayudarte a encontrar palabras antes de decidir qué decir.",
      "Если сначала написать для себя, будет легче подобрать слова и решить, что сказать.",
    ],
    A11: [
      "A kind note can be a small way to care for someone.",
      "Uma mensagem gentil pode ser uma pequena forma de cuidar de alguém.",
      "Un mensaje amable puede ser una pequeña forma de cuidar a alguien.",
      "Несколько добрых слов — простой способ позаботиться о ком-то.",
    ],
    A12: [
      "You can let someone know what their kindness meant to you.",
      "Você pode contar a alguém o quanto a gentileza significou para você.",
      "Puedes contarle a alguien cuánto significó para ti su amabilidad.",
      "Вы можете рассказать человеку, как много для вас значила его доброта.",
    ],
    A14: [
      "Listening can be a way to comfort someone.",
      "Escutar pode ser uma forma de confortar alguém.",
      "Escuchar puede ser una forma de consolar a alguien.",
      "Выслушать другого — один из способов его утешить.",
    ],
    A15: [
      "A prayer request lets you invite others to pray with you.",
      "Um pedido de oração permite convidar outras pessoas a orar com você.",
      "Una petición de oración te permite invitar a otros a orar contigo.",
      "Если оставить просьбу о молитве, другие смогут помолиться вместе с вами.",
    ],
    A16: [
      "Prayer can be one way to hold another person in your thoughts.",
      "A oração pode ser uma forma de lembrar de outra pessoa com carinho.",
      "La oración puede ser una forma de tener presente a otra persona.",
      "В молитве можно с теплом подумать о другом человеке.",
    ],
    A18: [
      "Pay it forward offers ways to explore causes and give back.",
      "Fazer o bem oferece caminhos para conhecer causas e retribuir.",
      "Compartir el bien ofrece maneras de conocer causas y ayudar.",
      "В разделе «Добрые дела» можно найти важное для вас дело и помочь.",
    ],
    A19: [
      "A story of hope may offer a different perspective.",
      "Uma história de esperança pode trazer outra perspectiva.",
      "Una historia de esperanza puede ofrecer otra perspectiva.",
      "История о надежде может помочь взглянуть на всё иначе.",
    ],
    A20: [
      "Sharing your testimony can let others learn from your experience.",
      "Compartilhar seu testemunho pode permitir que outros conheçam sua experiência.",
      "Compartir tu testimonio permite que otros conozcan tu experiencia.",
      "Если вы поделитесь свидетельством, ваш опыт может помочь другим.",
    ],
    A21: [
      "Lighting a candle can mark a quiet moment of prayer.",
      "Acender uma vela pode marcar um momento tranquilo de oração.",
      "Encender una vela puede acompañar un momento tranquilo de oración.",
      "Можно зажечь свечу и тихо помолиться.",
    ],
    A25: [
      "A gathering can offer a chance to connect with others.",
      "Um encontro pode oferecer uma oportunidade de se conectar com outras pessoas.",
      "Un encuentro puede ofrecer una oportunidad de conectar con otras personas.",
      "На встрече можно пообщаться с другими людьми.",
    ],
    A26: [
      "Bible Study offers space to explore this question through scripture.",
      "O Estudo Bíblico oferece espaço para explorar essa pergunta nas Escrituras.",
      "El Estudio Bíblico ofrece espacio para explorar esta pregunta en las Escrituras.",
      "В разделе «Изучение Библии» можно поразмышлять над этим вопросом с опорой на Писание.",
    ],
    A27: [
      "Hosting a gathering can make space for others to connect.",
      "Criar um encontro pode abrir espaço para outras pessoas se conectarem.",
      "Crear un encuentro puede abrir un espacio para que otros se conecten.",
      "Если вы организуете встречу, у других появится возможность пообщаться.",
    ],
  };
  if (purpose[action])
    return purpose[action][{ en: 0, pt: 1, es: 2, ru: 3 }[lang]];
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

// Refresh old generic wording for display without rewriting saved entries or
// replacing a personal, context-specific explanation.
export function displayedJournalInvitation(
  lang: Language,
  theme: string,
  action: string,
  saved?: string,
) {
  const legacyGroups: Record<string, string> = {
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
    A15: "connection",
    A16: "prayer",
    A18: "kindness",
    A19: "explore",
    A20: "explore",
    A21: "prayer",
    A25: "connection",
    A26: "explore",
    A27: "kindness",
  };
  const legacy: Record<string, string[]> = {
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
  const previous =
    legacy[legacyGroups[action]]?.[{ en: 0, pt: 1, es: 2, ru: 3 }[lang]];
  return !saved || (previous && saved === previous)
    ? journalActionCopy(lang, theme, action).invitation
    : saved;
}
