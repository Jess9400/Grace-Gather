import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  External,
} from "../components/ui";
import { useApp } from "../lib/state";
import { copy } from "../lib/content";
import { label } from "../lib/labels";
const policy = {
  en: [
    [
      "Your private journal",
      "Text, feelings, reflections and recordings are stored in an encrypted database and encrypted audio files on your device. The encryption key is kept in the device keychain. The browser preview keeps temporary data in memory. We do not automatically upload your journal or process it with AI. Exported backups are encrypted; keep the recovery key separately. Losing the key or deleting the app may make local data unrecoverable.",
    ],
    [
      "Your account and community",
      "If you create an account, Supabase processes your sign-in email and account identifiers. Profile synchronization is optional and includes your name, city, language, Christian tradition and notification preference. Comments and your chosen display name become visible after moderation; likes, reservations, reports and blocks are stored separately from your journal. Account deletion is available in Settings. Deleted accounts remove linked profile and community records; the local journal remains until you choose to delete it. Operational backups may persist for the configured provider retention period.",
    ],
    [
      "Your choices",
      "Microphone access is requested when you record. Local reminders and gathering push notifications require permission. Email updates require consent and a verified address; email delivery is not active in this preview. No precise location, advertising identifier or contact list is requested. External publishers and charities apply their own privacy policies. Audio gatherings, when configured, use LiveKit; other participants can hear anything you choose to say.",
    ],
    [
      "Care and moderation",
      "Away Church is a spiritual wellbeing app, not therapy or emergency care. Journal entries are not monitored. Community harassment, hate, spam, unsafe medical advice and disclosure of another person’s private information are prohibited. Use Report or Block, or contact support. Resources and book suggestions do not promise recovery.",
    ],
    [
      "Questions and rights",
      "Contact Away Church at hello@awaychurch.com to request help, access, correction or deletion of account data. You can export an encrypted local journal, delete entries and remove all device data in Account. This early-access policy must be reviewed against the final production providers and retention settings before public launch.",
    ],
  ],
  pt: [
    [
      "Seu diário privado",
      "Textos, sentimentos, reflexões e gravações ficam criptografados neste dispositivo. A chave fica no chaveiro seguro do aparelho. A prévia no navegador usa memória temporária. Não enviamos seu diário automaticamente nem o processamos com IA. As cópias exportadas são criptografadas; guarde a chave de recuperação separadamente. A perda da chave ou exclusão do app pode impedir a recuperação.",
    ],
    [
      "Sua conta e comunidade",
      "Se você criar uma conta, o Supabase processa seu email e identificadores de acesso. A sincronização opcional inclui nome, cidade, idioma, tradição cristã e preferências de notificação. Comentários e nome público aparecem após moderação. Curtidas, reservas, denúncias e bloqueios ficam separados do diário. Você pode excluir a conta nas configurações. O diário local só é removido se você escolher. Cópias operacionais podem persistir pelo prazo configurado no provedor.",
    ],
    [
      "Suas escolhas",
      "Pedimos acesso ao microfone ao gravar. Lembretes e notificações exigem permissão. Emails exigem consentimento e endereço verificado; o envio não está ativo nesta prévia. Não solicitamos localização precisa, identificador de publicidade ou contatos. Sites externos têm suas próprias políticas. Encontros de áudio, quando configurados, usam LiveKit; outros participantes ouvem o que você decidir compartilhar.",
    ],
    [
      "Cuidado e moderação",
      "Away Church é um app de bem-estar espiritual, não terapia ou atendimento de emergência. O diário não é monitorado. Assédio, ódio, spam, orientações médicas perigosas e divulgação de informações privadas de terceiros são proibidos. Use Denunciar ou Bloquear, ou contate o suporte. Os recursos e livros não prometem recuperação.",
    ],
    [
      "Dúvidas e direitos",
      "Contate Away Church em hello@awaychurch.com para solicitar ajuda, acesso, correção ou exclusão de dados. Em Conta, você pode exportar uma cópia criptografada ou excluir dados locais. Esta política inicial precisa ser revisada conforme os provedores e prazos de retenção finais antes do lançamento público.",
    ],
  ],
  es: [
    [
      "Tu diario privado",
      "Textos, sentimientos, reflexiones y grabaciones se cifran en tu dispositivo. La clave se guarda en su llavero seguro. La vista previa usa memoria temporal. No subimos tu diario automáticamente ni lo procesamos con IA. Las copias exportadas están cifradas; guarda la clave de recuperación aparte. Perderla o borrar la app puede impedir recuperar los datos.",
    ],
    [
      "Tu cuenta y comunidad",
      "Al crear una cuenta, Supabase procesa tu correo e identificadores. La sincronización opcional incluye nombre, ciudad, idioma, tradición cristiana y preferencias de notificación. Comentarios y nombre público aparecen tras moderación. Los me gusta, reservas, denuncias y bloqueos se guardan aparte del diario. Puedes eliminar la cuenta en Ajustes. El diario local se conserva hasta que elijas borrarlo. Las copias operativas pueden permanecer durante la retención configurada del proveedor.",
    ],
    [
      "Tus decisiones",
      "Pedimos permiso de micrófono al grabar. Recordatorios y notificaciones requieren permiso. Los correos requieren consentimiento y dirección verificada; no están activos en esta vista previa. No pedimos ubicación precisa, identificador publicitario ni contactos. Los sitios externos tienen sus propias políticas. Las reuniones de audio usan LiveKit cuando está configurado; los participantes oyen lo que decidas compartir.",
    ],
    [
      "Cuidado y moderación",
      "Away Church es una app de bienestar espiritual, no terapia ni atención de emergencia. No se supervisa el diario. Se prohíben acoso, odio, spam, consejos médicos peligrosos y datos privados ajenos. Usa Denunciar o Bloquear, o contacta con ayuda. Los recursos y libros no prometen recuperación.",
    ],
    [
      "Preguntas y derechos",
      "Contacta con Away Church en hello@awaychurch.com para pedir ayuda, acceso, corrección o eliminación de datos. En Cuenta puedes exportar una copia cifrada o borrar datos locales. Esta política inicial debe revisarse según proveedores y retención finales antes del lanzamiento público.",
    ],
  ],
  ru: [
    [
      "Личный дневник",
      "Текст, чувства, размышления и аудио хранятся на устройстве в зашифрованном виде. Ключ хранится в защищённой связке ключей. Браузерная версия использует временную память. Мы не загружаем дневник автоматически и не обрабатываем его ИИ. Экспортированные копии зашифрованы; храните ключ восстановления отдельно. Утрата ключа или удаление приложения могут сделать данные недоступными.",
    ],
    [
      "Аккаунт и сообщество",
      "При создании аккаунта Supabase обрабатывает адрес почты и идентификаторы. Необязательная синхронизация включает имя, город, язык, христианскую традицию и настройки уведомлений. Комментарии и публичное имя видны после проверки. Отметки, записи на встречи, жалобы и блокировки хранятся отдельно от дневника. Аккаунт можно удалить в настройках. Личный дневник удаляется отдельно. Рабочие резервные копии могут сохраняться в течение установленного провайдером срока.",
    ],
    [
      "Ваш выбор",
      "Доступ к микрофону запрашивается при записи. Напоминания и уведомления требуют разрешения. Письма требуют согласия и подтверждённого адреса; в этой версии отправка не включена. Точная геолокация, рекламный идентификатор и контакты не запрашиваются. Внешние сайты применяют свои политики. Аудиовстречи используют LiveKit, когда он подключён; участники слышат то, чем вы решили поделиться.",
    ],
    [
      "Забота и модерация",
      "Away Church помогает духовному благополучию и не заменяет терапию или экстренную помощь. Дневник не отслеживается. Запрещены травля, ненависть, спам, опасные медицинские советы и чужие личные данные. Используйте жалобу или блокировку либо обратитесь в поддержку. Материалы и книги не обещают выздоровления.",
    ],
    [
      "Вопросы и права",
      "Обратитесь в Away Church по адресу hello@awaychurch.com для помощи, доступа, исправления или удаления данных. В аккаунте можно экспортировать зашифрованную копию или удалить данные устройства. Эту предварительную политику необходимо проверить с учётом окончательных провайдеров и сроков хранения перед публичным запуском.",
    ],
  ],
};
export default function Privacy() {
  const { profile } = useApp();
  return (
    <Screen back>
      <Heading>{label(profile.language, "privacy")}</Heading>
      <Body small>Away Church · 3 November 2026</Body>
      {policy[profile.language].map(([title, body]) => (
        <Card key={title}>
          <Subheading>{title}</Subheading>
          <Body>{body}</Body>
        </Card>
      ))}
      <Body>{copy(profile.language, "supportBoundary")}</Body>
      <External
        title="hello@awaychurch.com"
        url="mailto:hello@awaychurch.com"
      />
    </Screen>
  );
}
