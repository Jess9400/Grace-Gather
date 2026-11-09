import type { Language } from "./content";
const words: Record<string, string[]> = {
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
