import type { Language } from "./content";
const words = {
  open: [
    "Continue talking",
    "Continuar conversando",
    "Seguir hablando",
    "Продолжить разговор",
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
    "Повторить ответ",
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
    "AI chat is not connected in this preview.",
    "O chat com IA não está conectado nesta prévia.",
    "El chat con IA no está conectado en esta vista previa.",
    "В этом предпросмотре чат с ИИ не подключён.",
  ],
  signin: [
    "Sign in to continue",
    "Entre para continuar",
    "Inicia sesión para continuar",
    "Войдите, чтобы продолжить",
  ],
  privacy: [
    "AI conversation · Saved with this entry on this device. Sending shares this entry and conversation with Alibaba Qwen.",
    "Conversa com IA · Salva com esta entrada neste dispositivo. Ao enviar, a entrada e a conversa são compartilhadas com Alibaba Qwen.",
    "Conversación con IA · Guardada con esta entrada en este dispositivo. Al enviar, la entrada y la conversación se comparten con Alibaba Qwen.",
    "Разговор с ИИ · Сохранён с записью на этом устройстве. При отправке запись и разговор передаются Alibaba Qwen.",
  ],
  you: ["You", "Você", "Tú", "Вы"],
  ai: ["AI companion", "Companheiro de IA", "Compañero de IA", "ИИ-собеседник"],
  limit: [
    "This conversation is full. You can begin a new journal entry.",
    "Esta conversa está cheia. Você pode iniciar uma nova entrada.",
    "Esta conversación está llena. Puedes comenzar una nueva entrada.",
    "Разговор заполнен. Можно начать новую запись.",
  ],
};
export function chatCopy(lang: Language, key: keyof typeof words) {
  return words[key][{ en: 0, pt: 1, es: 2, ru: 3 }[lang]];
}
