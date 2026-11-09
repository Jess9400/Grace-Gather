import type { Language } from "./content";
const words = {
  title: [
    "Optional AI guidance",
    "Orientação por IA opcional",
    "Orientación con IA opcional",
    "Подсказки ИИ — по желанию",
  ],
  consent: [
    "When AI guidance is on, this entry and your language/Christian tradition preferences go through Supabase to Alibaba Qwen. Your recording is sent only when you tap Transcribe. Processing may occur outside your country. AI can misunderstand you; it is not a diagnosis or emergency service. You can continue without AI.",
    "Quando a orientação por IA está ativada, esta entrada e suas preferências de idioma e tradição cristã passam pelo Supabase para o Alibaba Qwen. O áudio só é enviado ao tocar em Transcrever. O processamento pode ocorrer fora do seu país. A IA pode interpretar errado; não oferece diagnóstico nem atendimento de emergência. Você pode continuar sem IA.",
    "Cuando la orientación con IA está activada, esta entrada y tus preferencias de idioma y tradición cristiana pasan por Supabase a Alibaba Qwen. Tu grabación solo se envía al tocar Transcribir. El procesamiento puede ocurrir fuera de tu país. La IA puede equivocarse; no ofrece diagnósticos ni atención de emergencia. Puedes continuar sin IA.",
    "Когда подсказки ИИ включены, эта запись и выбранные язык и христианская традиция будут отправлены через Supabase в Alibaba Qwen. Аудиозапись отправляется только по нажатию «Расшифровать». Данные могут обрабатываться за пределами вашей страны. ИИ может ошибаться; это не диагностика и не экстренная помощь. Можно продолжить без ИИ.",
  ],
  agree: [
    "I agree: use AI for this entry",
    "Concordo: usar IA nesta entrada",
    "Acepto: usar IA para esta entrada",
    "Согласен: использовать ИИ для этой записи",
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
    "Расшифровать мою запись",
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
    "Не удалось подключиться. Войдите и попробуйте ещё раз. Текст и запись сохранены.",
  ],
  signIn: [
    "Sign in for AI guidance",
    "Entrar para usar a IA",
    "Iniciar sesión para usar IA",
    "Войти для использования ИИ",
  ],
  writingFirst: [
    "Write a little, or transcribe and review your recording, before using AI.",
    "Escreva um pouco ou transcreva e revise sua gravação antes de usar a IA.",
    "Escribe algo o transcribe y revisa tu grabación antes de usar IA.",
    "Напишите немного или расшифруйте и проверьте аудио перед использованием ИИ.",
  ],
  working: [
    "Preparing your reflection…",
    "Preparando sua reflexão…",
    "Preparando tu reflexión…",
    "Подготавливаем размышление…",
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
    "Your journal is encrypted on this device. AI processing is optional.",
    "Seu diário é criptografado neste dispositivo. A IA é opcional.",
    "Tu diario está cifrado en este dispositivo. La IA es opcional.",
    "Дневник зашифрован на этом устройстве. Обработка ИИ необязательна.",
  ],
};
export const aiCopy = (language: Language, key: keyof typeof words) =>
  words[key][["en", "pt", "es", "ru"].indexOf(language)];
export const AI_CONSENT_VERSION = "qwen-journal-2026-11-03";
