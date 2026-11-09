import type { Language } from "./content";
const text = {
  heading: [
    "One gentle step",
    "Um pequeno passo",
    "Un pequeño paso",
    "Один небольшой шаг",
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
    "Bring one worry to God in prayer",
    "Leve uma preocupação a Deus em oração",
    "Lleva una preocupación a Dios en oración",
    "Доверьте одну тревогу Богу в молитве",
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
