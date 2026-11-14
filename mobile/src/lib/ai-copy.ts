import type { Language } from "./content";
const words = {
  title: [
    "Optional AI guidance",
    "Orientação por IA opcional",
    "Orientación con IA opcional",
    "Подсказки ИИ — по желанию",
  ],
  consent: [
    "With your permission, your journal writing, recent conversation, Bible study questions and language and tradition preferences are sent through Supabase to our AI provider, Alibaba Cloud. Recordings are sent only when you choose Transcribe. Processing may occur outside your country. AI is not emergency care. You can withdraw permission in Preferences.",
    "Com sua permissão, seu diário, conversa recente, perguntas sobre a Bíblia e preferências de idioma e tradição são enviados pelo Supabase ao nosso provedor de IA, Alibaba Cloud. Áudios só são enviados ao escolher Transcrever. O processamento pode ocorrer fora do seu país. A IA não é atendimento de emergência. Você pode retirar a permissão em Preferências.",
    "Con tu permiso, tu diario, conversación reciente, preguntas bíblicas y preferencias de idioma y tradición se envían mediante Supabase a nuestro proveedor de IA, Alibaba Cloud. Los audios solo se envían al elegir Transcribir. El procesamiento puede ocurrir fuera de tu país. La IA no es atención de emergencia. Puedes retirar tu permiso en Preferencias.",
    "С вашего разрешения дневник, недавний разговор, вопросы о Библии и настройки языка и традиции отправляются через Supabase нашему провайдеру ИИ Alibaba Cloud. Аудио отправляется только при выборе расшифровки. Обработка может проходить за пределами вашей страны. ИИ не является экстренной помощью. Разрешение можно отозвать в настройках.",
  ],
  agree: [
    "I agree: use AI for this entry",
    "Concordo: usar IA nesta entrada",
    "Acepto: usar IA para esta entrada",
    "Согласиться и использовать ИИ для этой записи",
  ],
  off: [
    "AI enabled · Turn off",
    "IA ativada · Desativar",
    "IA activada · Desactivar",
    "ИИ включён · Выключить",
  ],
  transcribe: [
    "Transcribe my recording",
    "Transcrever minha gravação",
    "Transcribir mi grabación",
    "Расшифровать аудиозапись",
  ],
  review: [
    "Review and edit the transcription above before continuing.",
    "Revise e edite a transcrição acima antes de continuar.",
    "Revisa y edita la transcripción antes de continuar.",
    "Проверьте и исправьте расшифровку выше, прежде чем продолжить.",
  ],
  failed: [
    "AI was unavailable. Your entry is saved; these are general suggestions.",
    "A IA estava indisponível. Sua entrada foi salva; estas são sugestões gerais.",
    "La IA no estaba disponible. Tu entrada está guardada; estas son sugerencias generales.",
    "ИИ был недоступен. Запись сохранена; показаны общие рекомендации.",
  ],
  requestFailed: [
    "Could not connect. Sign in and try again. Your writing and recording are unchanged.",
    "Não foi possível conectar. Entre na sua conta e tente novamente. Seu texto e áudio foram preservados.",
    "No se pudo conectar. Inicia sesión e inténtalo de nuevo. Tu texto y grabación se conservan.",
    "Не удалось подключиться. Войдите и попробуйте ещё раз. Текст и аудиозапись не изменились.",
  ],
  signIn: [
    "Sign in for AI guidance",
    "Entrar para usar a IA",
    "Iniciar sesión para usar IA",
    "Войти, чтобы пользоваться ИИ",
  ],
  writingFirst: [
    "Write a little, or transcribe and review your recording, before using AI.",
    "Escreva um pouco ou transcreva e revise sua gravação antes de usar a IA.",
    "Escribe algo o transcribe y revisa tu grabación antes de usar IA.",
    "Прежде чем обращаться к ИИ, напишите хоть немного или расшифруйте и проверьте аудиозапись.",
  ],
  working: [
    "Preparing your reflection…",
    "Preparando sua reflexão…",
    "Preparando tu reflexión…",
    "Готовим размышление…",
  ],
  interpretation: [
    "AI suggested this theme. Does it fit?",
    "A IA sugeriu este tema. Faz sentido?",
    "La IA sugirió este tema. ¿Te representa?",
    "ИИ предложил эту тему. Она вам подходит?",
  ],
  change: [
    "Change the theme",
    "Alterar o tema",
    "Cambiar el tema",
    "Изменить тему",
  ],
  local: [
    "Your journal is saved privately to your account. AI guidance is optional.",
    "Seu diário é salvo de forma privada na sua conta. A orientação por IA é opcional.",
    "Tu diario se guarda de forma privada en tu cuenta. La orientación con IA es opcional.",
    "Дневник сохраняется в вашей учётной записи. Подсказки ИИ необязательны.",
  ],
};
export const aiCopy = (language: Language, key: keyof typeof words) =>
  words[key][["en", "pt", "es", "ru"].indexOf(language)];
// Earlier versions were enabled by default, so they are not evidence of consent.
export const AI_CONSENT_VERSION = "qwen-journal-explicit-2026-11-14";
