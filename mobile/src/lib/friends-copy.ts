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
    "Поиск идёт только по уже загруженным обсуждениям. Загрузите ещё, чтобы искать дальше.",
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
  "Be kind. Everyone in the community can read this, so keep private details out. Each message is checked before it appears, and moderators look at anything uncertain.":
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
    "После проверки обсуждение смогут читать и комментировать все участники сообщества.",
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
      "Люди появляются здесь, только если они разрешили находить себя в поиске и вы согласились добавить друг друга.",
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
  "Share my friend link": [
    "Compartilhar meu link de amizade",
    "Compartir mi enlace de amistad",
    "Поделиться ссылкой для друзей",
  ],
  "Make a new friend link (the old one stops working)": [
    "Criar um novo link (o antigo deixa de funcionar)",
    "Crear un enlace nuevo (el anterior deja de funcionar)",
    "Создать новую ссылку (старая перестанет работать)",
  ],
  "Save a public name first, then share your link.": [
    "Primeiro salve um nome público e depois compartilhe seu link.",
    "Primero guarda un nombre público y luego comparte tu enlace.",
    "Сначала сохраните публичное имя, потом поделитесь ссылкой.",
  ],
  "New link made. The old one no longer works.": [
    "Novo link criado. O antigo não funciona mais.",
    "Enlace nuevo creado. El anterior ya no funciona.",
    "Новая ссылка готова. Старая больше не работает.",
  ],
  "Add me as a friend on Grace & Gather:": [
    "Me adicione como amigo no Grace & Gather:",
    "Agrégame como amigo en Grace & Gather:",
    "Добавьте меня в друзья в Grace & Gather:",
  ],
  "This friend link no longer works. Ask for a new one.": [
    "Este link de amizade não funciona mais. Peça um novo.",
    "Este enlace de amistad ya no funciona. Pide uno nuevo.",
    "Эта ссылка больше не работает. Попросите новую.",
  ],
  "This is your own friend link. Share it with people you know.": [
    "Este é o seu próprio link de amizade. Compartilhe com pessoas que você conhece.",
    "Este es tu propio enlace de amistad. Compártelo con personas que conoces.",
    "Это ваша собственная ссылка. Поделитесь ею со знакомыми.",
  ],
  "You are already friends with {name}.": [
    "Você e {name} já são amigos.",
    "Tú y {name} ya son amigos.",
    "Вы с {name} уже друзья.",
  ],
  "{name} invited you to be friends.": [
    "{name} convidou você para serem amigos.",
    "{name} te invitó a ser amigos.",
    "{name} приглашает вас в друзья.",
  ],
  "Choose a public name first. {name} will see it.": [
    "Primeiro escolha um nome público. {name} vai vê-lo.",
    "Primero elige un nombre público. {name} lo verá.",
    "Сначала выберите публичное имя — {name} его увидит.",
  ],
  "Add {name} as a friend": [
    "Adicionar {name} como amigo",
    "Agregar a {name} como amigo",
    "Добавить {name} в друзья",
  ],
  "You are now friends.": [
    "Agora vocês são amigos.",
    "Ahora son amigos.",
    "Теперь вы друзья.",
  ],
  "Close": [
    "Fechar",
    "Cerrar",
    "Закрыть",
  ],
  "How friends find you": [
    "Como os amigos encontram você",
    "Cómo te encuentran tus amigos",
    "Как вас найти друзьям",
  ],
  "No one found with that name. They may not have turned on “Let members find me” yet.": [
    "Ninguém encontrado com esse nome. Talvez a pessoa ainda não tenha ativado “Permitir que membros me encontrem”.",
    "No se encontró a nadie con ese nombre. Puede que aún no haya activado “Permitir que otros me encuentren”.",
    "Никого не нашли с таким именем. Возможно, человек ещё не включил «Разрешить находить меня».",
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
      "Сообщения видит ваш друг. Если на сообщение пожалуются, его смогут проверить модераторы.",
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
    "Предыдущие сообщения",
  ],
  Back: ["Voltar", "Volver", "Назад"],
  Block: ["Bloquear", "Bloquear", "Заблокировать"],
  Unblock: ["Desbloquear", "Desbloquear", "Разблокировать"],
  "Blocked members": [
    "Membros bloqueados",
    "Miembros bloqueados",
    "Заблокированные",
  ],
  "Remove friend": ["Remover amigo", "Eliminar amigo", "Удалить из друзей"],
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
