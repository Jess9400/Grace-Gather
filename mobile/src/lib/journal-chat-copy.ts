import type { Language } from "./content";
const words = {
  prompt: [
    "Did this help, or would you like to keep talking?",
    "Isso ajudou ou você gostaria de continuar conversando?",
    "¿Te ayudó o te gustaría seguir hablando?",
    "Это помогло или хотите продолжить разговор?",
  ],
  open: [
    "Continue talking",
    "Continuar conversando",
    "Seguir hablando",
    "Продолжить разговор",
  ],
  reflection: [
    "Your reflection",
    "Sua reflexão",
    "Tu reflexión",
    "Ваша запись",
  ],
  rateLimit: [
    "Conversation limit reached. Your message is saved. Please try again later.",
    "Limite de conversa atingido. Sua mensagem foi salva. Tente novamente mais tarde.",
    "Se alcanzó el límite de conversación. Tu mensaje está guardado. Inténtalo más tarde.",
    "Достигнут лимит разговора. Сообщение сохранено. Попробуйте позже.",
  ],
  providerBusy: [
    "A reply is taking longer than usual. Your message is saved. Please try again shortly.",
    "A resposta está demorando mais que o normal. Sua mensagem foi salva. Tente novamente em breve.",
    "La respuesta está tardando más de lo habitual. Tu mensaje está guardado. Inténtalo de nuevo en un momento.",
    "Ответ готовится дольше обычного. Сообщение сохранено. Попробуйте чуть позже.",
  ],
  close: [
    "Close conversation",
    "Fechar conversa",
    "Cerrar conversación",
    "Закрыть разговор",
  ],
  intro: [
    "What felt missing, or what is still on your heart?",
    "O que faltou ou ainda está no seu coração?",
    "¿Qué faltó o qué sigue en tu corazón?",
    "Чего не хватило или что ещё у вас на сердце?",
  ],
  label: ["Your message", "Sua mensagem", "Tu mensaje", "Ваше сообщение"],
  send: ["Send", "Enviar", "Enviar", "Отправить"],
  waiting: ["Listening…", "Ouvindo…", "Escuchando…", "Слушаю…"],
  retry: [
    "Try reply again",
    "Tentar resposta novamente",
    "Volver a intentar la respuesta",
    "Запросить ответ ещё раз",
  ],
  failed: [
    "Your message is saved. The reply is unavailable right now.",
    "Sua mensagem foi salva. A resposta está indisponível no momento.",
    "Tu mensaje está guardado. La respuesta no está disponible ahora.",
    "Сообщение сохранено. Ответ сейчас недоступен.",
  ],
  saveFailed: [
    "Could not save. Your words are still here.",
    "Não foi possível salvar. Suas palavras continuam aqui.",
    "No se pudo guardar. Tus palabras siguen aquí.",
    "Не удалось сохранить. Ваш текст остался здесь.",
  ],
  consent: [
    "Enable AI guidance in Preferences to continue talking.",
    "Ative a orientação por IA nas Preferências para continuar.",
    "Activa la orientación con IA en Preferencias para continuar.",
    "Включите подсказки ИИ в настройках, чтобы продолжить.",
  ],
  preferences: ["Preferences", "Preferências", "Preferencias", "Настройки"],
  local: [
    "Conversation is not connected in this preview.",
    "A conversa não está conectada nesta prévia.",
    "La conversación no está conectada en esta vista previa.",
    "В этом предпросмотре разговор недоступен.",
  ],
  emailFirst: [
    "Sign in to keep talking.",
    "Entre na sua conta para continuar conversando.",
    "Inicia sesión para seguir hablando.",
    "Войдите, чтобы продолжить разговор.",
  ],
  addEmail: [
    "Add my email",
    "Adicionar meu e-mail",
    "Añadir mi correo",
    "Указать email",
  ],
  signin: [
    "Sign in to continue",
    "Entre para continuar",
    "Inicia sesión para continuar",
    "Войдите, чтобы продолжить",
  ],
  privacy: [
    "This conversation is saved with your journal entry. With your permission, your entry and recent conversation are sent to an external AI service to generate replies. See Privacy & support for provider details.",
    "Esta conversa é salva com sua entrada no diário. Com sua permissão, sua entrada e conversa recente são enviadas a um serviço externo de IA para gerar respostas. Veja os detalhes do provedor em Privacidade e suporte.",
    "Esta conversación se guarda con tu entrada. Con tu permiso, la entrada y la conversación reciente se envían a un servicio externo de IA para generar respuestas. Consulta los detalles del proveedor en Privacidad y ayuda.",
    "Разговор сохраняется вместе с записью дневника. С вашего разрешения запись и недавний разговор отправляются внешней службе ИИ для создания ответов. Сведения о провайдере — в разделе конфиденциальности.",
  ],
  you: ["You", "Você", "Tú", "Вы"],
  ai: ["Reflection", "Reflexão", "Reflexión", "Размышление"],
  limit: [
    "This conversation is full. You can begin a new journal entry.",
    "Esta conversa está cheia. Você pode iniciar uma nova entrada.",
    "Esta conversación está llena. Puedes comenzar una nueva entrada.",
    "Разговор достиг максимальной длины. Можно начать новую запись.",
  ],
};
export function chatCopy(lang: Language, key: keyof typeof words) {
  return words[key][{ en: 0, pt: 1, es: 2, ru: 3 }[lang]];
}
