import type { Language } from "./content";
const words: Record<string, string[]> = {
  // The screen behind "Chats" on Gather: friends (1:1) and group chats.
  "Your people": ["Sua gente", "Tu gente", "Свои люди"],
  "Group chats": ["Conversas em grupo", "Chats de grupo", "Общие чаты"],
  Open: ["Abrir", "Abrir", "Открыть"],
  "Last message": ["Última mensagem", "Último mensaje", "Последнее сообщение"],
  "Everyone in the community can read this room. Please do not share private details. Reported messages are reviewed by moderators.":
    [
      "Todos na comunidade podem ler esta sala. Não compartilhe detalhes pessoais. Mensagens denunciadas são analisadas por moderadores.",
      "Toda la comunidad puede leer esta sala. No compartas datos personales. Los moderadores revisan los mensajes denunciados.",
      "Эту комнату читает вся община. Не делитесь личными данными. Жалобы рассматривают модераторы.",
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
  "Group chats are not available yet.": [
    "As conversas em grupo ainda não estão disponíveis.",
    "Los chats de grupo aún no están disponibles.",
    "Общие чаты пока недоступны.",
  ],
  "You are writing quickly. Please wait a moment.": [
    "Você está escrevendo rápido. Aguarde um momento.",
    "Estás escribiendo muy rápido. Espera un momento.",
    "Вы пишете слишком часто. Подождите немного.",
  ],
  "Block this member?": [
    "Bloquear este membro?",
    "¿Bloquear a este miembro?",
    "Заблокировать участника?",
  ],
  "You will stop seeing each other's messages, and any friendship between you ends.":
    [
      "Vocês deixarão de ver as mensagens um do outro, e qualquer amizade entre vocês termina.",
      "Dejarán de ver los mensajes del otro, y cualquier amistad entre ustedes termina.",
      "Вы перестанете видеть сообщения друг друга, а дружба между вами прекратится.",
    ],
  Cancel: ["Cancelar", "Cancelar", "Отмена"],
  "Member blocked": [
    "Membro bloqueado",
    "Miembro bloqueado",
    "Участник заблокирован",
  ],
  "Group chat reports": [
    "Denúncias das conversas em grupo",
    "Denuncias de chats de grupo",
    "Жалобы в общих чатах",
  ],
  "Keep message": ["Manter mensagem", "Mantener mensaje", "Оставить сообщение"],
  "Remove message": [
    "Remover mensagem",
    "Eliminar mensaje",
    "Удалить сообщение",
  ],
  Member: ["Membro", "Miembro", "Участник"],
  You: ["Você", "Tú", "Вы"],
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
