import type { Language } from "./content";
// Each entry is [pt, es, ru], keyed by the English the screens pass in.
const words: Record<string, string[]> = {
  "Join discussion": [
    "Participar da discussão",
    "Participar en la conversación",
    "Присоединиться к обсуждению",
  ],
  "Loading discussions…": [
    "Carregando discussões…",
    "Cargando conversaciones…",
    "Загрузка обсуждений…",
  ],
  "No matching discussions found.": [
    "Nenhuma discussão encontrada.",
    "No se encontraron conversaciones.",
    "Обсуждения не найдены.",
  ],
  "Enter at least two characters.": [
    "Digite ao menos dois caracteres.",
    "Escribe al menos dos caracteres.",
    "Введите хотя бы два символа.",
  ],
  "Sign in to take part in discussions.": [
    "Entre para participar das discussões.",
    "Inicia sesión para participar en las conversaciones.",
    "Войдите, чтобы участвовать в обсуждениях.",
  ],
  "No matching discussions in the loaded posts.": [
    "Nenhuma discussão encontrada entre as publicações carregadas.",
    "No hay conversaciones coincidentes entre las publicaciones cargadas.",
    "Среди загруженных обсуждений ничего не найдено.",
  ],
  "Search covers discussions already loaded. Load more to search further.": [
    "A busca inclui as discussões já carregadas. Carregue mais para continuar procurando.",
    "La búsqueda incluye las conversaciones cargadas. Carga más para seguir buscando.",
    "Поиск охватывает загруженные обсуждения. Загрузите ещё, чтобы продолжить поиск.",
  ],
  // The screen behind "Chats" on Gather: friends (1:1) and group chats.
  "Your people": ["Sua gente", "Tu gente", "Свои люди"],
  Discussions: ["Discussões", "Conversaciones", "Обсуждения"],
  Discussion: ["Discussão", "Conversación", "Обсуждение"],
  "Talk together about a verse or anything on your heart.": [
    "Conversem sobre um versículo ou o que estiver no coração.",
    "Conversen sobre un versículo o lo que lleven en el corazón.",
    "Обсуждайте стих или то, что у вас на сердце.",
  ],
  "Start a discussion": [
    "Iniciar uma discussão",
    "Iniciar una conversación",
    "Начать обсуждение",
  ],
  All: ["Todas", "Todas", "Все"],
  Mine: ["Minhas", "Mías", "Мои"],
  "Being checked": ["Em verificação", "En revisión", "На проверке"],
  "1 reply": ["1 resposta", "1 respuesta", "1 ответ"],
  replies: ["respostas", "respuestas", "отв."],
  "Started by": ["Iniciada por", "Iniciada por", "Автор:"],
  "You have not joined a discussion yet.": [
    "Você ainda não participou de nenhuma discussão.",
    "Aún no has participado en ninguna conversación.",
    "Вы пока не участвовали ни в одном обсуждении.",
  ],
  "No discussions yet. Start the first one.": [
    "Ainda não há discussões. Comece a primeira.",
    "Aún no hay conversaciones. Empieza la primera.",
    "Обсуждений пока нет. Начните первое.",
  ],
  "More discussions": [
    "Mais discussões",
    "Más conversaciones",
    "Ещё обсуждения",
  ],
  "Be kind. Everyone in the community can read this, so keep private details out. Messages are safety-checked first; moderators review anything uncertain.":
    [
      "Seja gentil. Toda a comunidade pode ler, então não compartilhe detalhes pessoais. As mensagens passam por uma verificação de segurança antes de aparecer; moderadores analisam o que gerar dúvida.",
      "Sé amable. Toda la comunidad puede leerlo, así que no compartas datos personales. Los mensajes pasan una revisión de seguridad antes de mostrarse; los moderadores revisan lo dudoso.",
      "Будьте добры друг к другу. Это читают все в сообществе, поэтому не делитесь личными данными. Сообщения проверяются перед публикацией, а всё сомнительное смотрят модераторы.",
    ],
  "Being checked. Only you can see this for now.": [
    "Em verificação. Por enquanto só você vê isto.",
    "En revisión. Por ahora solo tú lo ves.",
    "На проверке. Пока это видите только вы.",
  ],
  "Not published.": ["Não publicada.", "No publicado.", "Не опубликовано."],
  "This discussion is no longer available.": [
    "Esta discussão não está mais disponível.",
    "Esta conversación ya no está disponible.",
    "Это обсуждение больше недоступно.",
  ],
  "You will stop seeing what this member writes in discussions.": [
    "Você deixará de ver o que este membro escreve nas discussões.",
    "Dejarás de ver lo que este miembro escribe en las conversaciones.",
    "Вы перестанете видеть сообщения этого участника в обсуждениях.",
  ],
  "Check again": ["Verificar de novo", "Revisar de nuevo", "Проверить ещё раз"],
  "Delete my message": [
    "Apagar minha mensagem",
    "Eliminar mi mensaje",
    "Удалить моё сообщение",
  ],
  "After a safety check, everyone in the community can read and reply.": [
    "Após a verificação de segurança, toda a comunidade pode ler e responder.",
    "Tras la revisión de seguridad, toda la comunidad puede leer y responder.",
    "После проверки безопасности обсуждение смогут читать и комментировать все в сообществе.",
  ],
  About: ["Sobre", "Sobre", "О стихе"],
  Title: ["Título", "Título", "Заголовок"],
  "What would you like to talk about?": [
    "Sobre o que você gostaria de conversar?",
    "¿De qué te gustaría conversar?",
    "О чём вы хотели бы поговорить?",
  ],
  "Talk any day, not only at gatherings.": [
    "Converse em qualquer dia, não só nos encontros.",
    "Conversa cualquier día, no solo en los encuentros.",
    "Общайтесь в любой день, не только на встречах.",
  ],
  "No messages yet": [
    "Ainda sem mensagens",
    "Aún sin mensajes",
    "Сообщений пока нет",
  ],
  "Private · only the two of you": [
    "Privado · só vocês dois",
    "Privado · solo ustedes dos",
    "Личный чат · только вы двое",
  ],
  "Write something kind…": [
    "Escreva algo gentil…",
    "Escribe algo amable…",
    "Напишите что-нибудь доброе…",
  ],
  More: ["Mais", "Más", "Ещё"],
  "Report or block": [
    "Denunciar ou bloquear",
    "Denunciar o bloquear",
    "Пожаловаться или заблокировать",
  ],
  "Private messages with people you've met, just between the two of you.": [
    "Mensagens privadas com pessoas que você conheceu, só entre vocês dois.",
    "Mensajes privados con personas que has conocido, solo entre ustedes dos.",
    "Личные сообщения с теми, с кем вы познакомились, — только для вас двоих.",
  ],
  "People appear here only if they chose to be findable, and both of you said yes.":
    [
      "As pessoas só aparecem aqui se escolheram ser encontradas e se os dois aceitaram.",
      "Las personas solo aparecen aquí si eligieron ser encontradas y ambos aceptaron.",
      "Люди появляются здесь, только если разрешили себя находить и вы оба согласились.",
    ],
  "No messages yet. Be the first to say hello.": [
    "Ainda não há mensagens. Seja o primeiro a dizer olá.",
    "Aún no hay mensajes. Sé el primero en saludar.",
    "Сообщений пока нет. Поздоровайтесь первыми.",
  ],
  "Choose a public name to write here. Only this name is shown with your messages.":
    [
      "Escolha um nome público para escrever aqui. Só este nome aparece com suas mensagens.",
      "Elige un nombre público para escribir aquí. Solo este nombre aparece con tus mensajes.",
      "Выберите публичное имя, чтобы писать здесь. Рядом с вашими сообщениями будет видно только оно.",
    ],
  "Block this member?": [
    "Bloquear este membro?",
    "¿Bloquear a este miembro?",
    "Заблокировать участника?",
  ],
  Cancel: ["Cancelar", "Cancelar", "Отменить"],
  "Member blocked": [
    "Membro bloqueado",
    "Miembro bloqueado",
    "Участник заблокирован",
  ],
  "Friends & chats": ["Amigos e conversas", "Amigos y chats", "Друзья и чаты"],
  "Find friends": ["Encontrar amigos", "Buscar amigos", "Найти друзей"],
  "Search by public name": [
    "Buscar pelo nome público",
    "Buscar por nombre público",
    "Поиск по публичному имени",
  ],
  Search: ["Buscar", "Buscar", "Найти"],
  "Your public name": [
    "Seu nome público",
    "Tu nombre público",
    "Ваше публичное имя",
  ],
  "Friend search settings": [
    "Configurar busca de amigos",
    "Ajustes de búsqueda de amigos",
    "Настройки поиска друзей",
  ],
  "Let members find me by this name": [
    "Permitir que membros me encontrem por este nome",
    "Permitir que otros me encuentren por este nombre",
    "Разрешить находить меня по этому имени",
  ],
  "Only your chosen name appears in search. Your email stays private.": [
    "Só o nome escolhido aparece na busca. Seu email é privado.",
    "Solo aparece tu nombre elegido. Tu correo es privado.",
    "В поиске видно только выбранное имя. Email скрыт.",
  ],
  Save: ["Salvar", "Guardar", "Сохранить"],
  Saved: ["Salvo", "Guardado", "Сохранено"],
  "Add friend": ["Adicionar amigo", "Añadir amigo", "Добавить в друзья"],
  "Request sent": [
    "Solicitação enviada",
    "Solicitud enviada",
    "Запрос отправлен",
  ],
  Accept: ["Aceitar", "Aceptar", "Принять"],
  Decline: ["Recusar", "Rechazar", "Отклонить"],
  "Cancel request": [
    "Cancelar solicitação",
    "Cancelar solicitud",
    "Отменить запрос",
  ],
  Chat: ["Conversar", "Chat", "Чат"],
  Friends: ["Amigos", "Amigos", "Друзья"],
  Requests: ["Solicitações", "Solicitudes", "Запросы"],
  "No friends yet.": [
    "Ainda sem amigos.",
    "Aún no tienes amigos.",
    "Друзей пока нет.",
  ],
  "No members found.": [
    "Nenhum membro encontrado.",
    "No se encontraron miembros.",
    "Участники не найдены.",
  ],
  "Save a public name to add friends.": [
    "Salve um nome público para adicionar amigos.",
    "Guarda un nombre público para añadir amigos.",
    "Чтобы добавлять друзей, сохраните публичное имя.",
  ],
  "Sign in to find friends and chat.": [
    "Entre para encontrar amigos e conversar.",
    "Inicia sesión para buscar amigos y chatear.",
    "Войдите, чтобы искать друзей и общаться.",
  ],
  "Sign in": ["Entrar", "Iniciar sesión", "Войти"],
  "Could not complete this. Please try again.": [
    "Não foi possível concluir. Tente novamente.",
    "No se pudo completar. Inténtalo de nuevo.",
    "Не удалось выполнить действие. Попробуйте ещё раз.",
  ],
  "Private conversation": [
    "Conversa privada",
    "Conversación privada",
    "Личная переписка",
  ],
  "Messages are shared with your friend. Reported messages can be reviewed by moderators.":
    [
      "Mensagens são compartilhadas com seu amigo. Moderadores podem revisar mensagens denunciadas.",
      "Los mensajes se comparten con tu amigo. Moderadores pueden revisar mensajes denunciados.",
      "Сообщения видны вашему другу. Модераторы могут проверить сообщения, на которые поступили жалобы.",
    ],
  "Write a message": [
    "Escreva uma mensagem",
    "Escribe un mensaje",
    "Напишите сообщение",
  ],
  Send: ["Enviar", "Enviar", "Отправить"],
  "Older messages": [
    "Mensagens anteriores",
    "Mensajes anteriores",
    "Более ранние сообщения",
  ],
  Back: ["Voltar", "Volver", "Назад"],
  Block: ["Bloquear", "Bloquear", "Заблокировать"],
  Unblock: ["Desbloquear", "Desbloquear", "Разблокировать"],
  "Blocked members": [
    "Membros bloqueados",
    "Miembros bloqueados",
    "Заблокированные",
  ],
  "Remove friend": ["Remover amigo", "Eliminar amigo", "Удалить друга"],
  Report: ["Denunciar", "Denunciar", "Пожаловаться"],
  "Reason for report": [
    "Motivo da denúncia",
    "Motivo de la denuncia",
    "Причина жалобы",
  ],
  "Report sent": ["Denúncia enviada", "Denuncia enviada", "Жалоба отправлена"],
  Refresh: ["Atualizar", "Actualizar", "Обновить"],
  "Chat reports": [
    "Denúncias de conversas",
    "Denuncias de chats",
    "Жалобы на сообщения",
  ],
  Resolve: ["Resolver", "Resolver", "Закрыть жалобу"],
};
export function friendCopy(lang: Language, key: string) {
  return lang === "en"
    ? key
    : (words[key]?.[{ pt: 0, es: 1, ru: 2 }[lang]] ?? key);
}
