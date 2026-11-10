import type { Language } from "./content";
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
  "Enter at least two characters to search discussions.": [
    "Digite ao menos dois caracteres para buscar discussões.",
    "Escribe al menos dos caracteres para buscar conversaciones.",
    "Введите не менее двух символов для поиска обсуждений.",
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
  "Talk together about a verse or anything on your heart. Every message passes a safety check before others see it.":
    [
      "Conversem sobre um versículo ou o que estiver no coração. Cada mensagem passa por uma verificação de segurança antes que outros a vejam.",
      "Conversen sobre un versículo o lo que lleven en el corazón. Cada mensaje pasa una revisión de seguridad antes de que otros lo vean.",
      "Говорите о стихе или о том, что на сердце. Каждое сообщение проходит проверку безопасности, прежде чем его увидят другие.",
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
  replies: ["respostas", "respuestas", "ответов"],
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
  "Be kind. Every message passes a safety check before others see it, and moderators look at anything uncertain. Everyone in the community can read this, so please do not share private details.":
    [
      "Seja gentil. Cada mensagem passa por uma verificação de segurança antes que outros a vejam, e moderadores analisam o que gerar dúvida. Toda a comunidade pode ler, então não compartilhe detalhes pessoais.",
      "Sé amable. Cada mensaje pasa una revisión de seguridad antes de que otros lo vean, y los moderadores revisan lo dudoso. Toda la comunidad puede leerlo, así que no compartas datos personales.",
      "Будьте добры друг к другу. Каждое сообщение проходит проверку безопасности, прежде чем его увидят другие, а сомнительные случаи смотрят модераторы. Это читает вся община, поэтому не делитесь личными данными.",
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
  "Anyone in the community can read and answer. It appears once it passes the safety check.":
    [
      "Qualquer pessoa da comunidade pode ler e responder. Ela aparece depois de passar pela verificação de segurança.",
      "Cualquier persona de la comunidad puede leer y responder. Aparece cuando pasa la revisión de seguridad.",
      "Любой участник общины может прочитать и ответить. Обсуждение появится после проверки безопасности.",
    ],
  About: ["Sobre", "Sobre", "О стихе"],
  Title: ["Título", "Título", "Заголовок"],
  "What would you like to talk about?": [
    "Sobre o que você gostaria de conversar?",
    "¿De qué te gustaría conversar?",
    "О чём вы хотели бы поговорить?",
  ],
  "Talk any day of the week, not only at gatherings.": [
    "Converse em qualquer dia da semana, não só nos encontros.",
    "Conversa cualquier día de la semana, no solo en los encuentros.",
    "Общайтесь в любой день недели, не только на встречах.",
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
  "Private messages with people you have met. Only the two of you can read them.":
    [
      "Mensagens privadas com pessoas que você conheceu. Só vocês dois podem ler.",
      "Mensajes privados con personas que has conocido. Solo ustedes dos pueden leerlos.",
      "Личные сообщения с теми, с кем вы познакомились. Их видите только вы двое.",
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
      "Выберите публичное имя, чтобы писать здесь. С сообщениями видно только его.",
    ],
  "Block this member?": [
    "Bloquear este membro?",
    "¿Bloquear a este miembro?",
    "Заблокировать участника?",
  ],
  Cancel: ["Cancelar", "Cancelar", "Отмена"],
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
  Search: ["Buscar", "Buscar", "Поиск"],
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
    "Разрешить поиск меня по этому имени",
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
  "No friends yet. Search for someone to connect with.": [
    "Ainda sem amigos. Busque alguém para se conectar.",
    "Aún no tienes amigos. Busca a alguien para conectar.",
    "Пока нет друзей. Найдите кого-нибудь.",
  ],
  "No members found.": [
    "Nenhum membro encontrado.",
    "No se encontraron miembros.",
    "Участники не найдены.",
  ],
  "Choose and save a public name before requesting friends.": [
    "Escolha e salve um nome público antes de adicionar amigos.",
    "Elige y guarda un nombre público antes de añadir amigos.",
    "Сначала выберите и сохраните публичное имя.",
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
    "Не удалось выполнить. Попробуйте снова.",
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
      "Сообщения видны вашему другу. Модераторы могут проверить сообщения с жалобами.",
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
    "Ранние сообщения",
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
