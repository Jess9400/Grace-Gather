import { journalCopy } from "../lib/journal-library-copy";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  External,
} from "../components/quiet-ui";
import { useApp } from "../lib/state";
import { copy } from "../lib/content";
import { label } from "../lib/labels";
const policy = {
  en: [
    [
      "Community discussions",
      "Only your chosen public name, optional perspective and submitted words are stored as Community posts in Supabase. Your diary and private profile are never attached. If separately enabled, posts, parent discussion context and report reasons are sent through Supabase to Alibaba Cloud Qwen for automated moderation. Community AI processing is currently disabled. Processing may occur outside your country under the provider retention policy. When moderation is active, posts that pass the checks are published to signed-in members. Concerning, uncertain or failed checks leave posts private. AI can make mistakes; held posts and appeals remain unpublished until a review process is available. Reports are private to the reporter and any authorized moderators. You can block people or remove your own posts; removing a topic removes its replies. Moderation action records are kept separately without post bodies. No continuous monitoring or emergency response is promised.",
    ],
    [
      "Confessions shared with listeners",
      "Sharing a confession uploads only the text and optional audio you explicitly submit. All submissions and responses wait for moderator approval. Listeners see themes and requested support; one listener at a time can open a confession for six hours. Without a response, it returns to the list. Only one comfort response is permitted and is visible to the writer, listener and authorized moderators. Names and emails are hidden from listeners, but moderators can access account-linked submissions and reports. A voice or the details you write may identify you. This is not end-to-end encryption or sacramental confession. Reports hide content pending review. You can close replies, block a person, or delete your confession and response. Moderation records are stored separately; contact support for deletion requests. No real-time monitoring or immediate reply is promised.",
    ],
    [
      "Your private journal",
      "Text, feelings, reflections and recordings are stored in an encrypted database and encrypted audio files on your device. The encryption key is kept in the device keychain. In the browser, sign-in, preferences and submitted entries are encrypted in local IndexedDB storage. The non-exportable key stays in the same browser; this does not protect an unlocked browser or malicious scripts. Submitted entries save automatically to My Journal and remain until you delete them. Clearing site data removes the vault. AI guidance starts enabled for new profiles and can be turned off during onboarding or in Preferences. While enabled, submitting an entry sends its text and language/tradition preferences through Supabase to Alibaba Cloud Qwen to suggest a verse and an action. Sending a chat message also shares that entry and recent conversation with Qwen. Nothing is sent while you type. Optional transcription sends the selected recording to Qwen only when you press Transcribe. You can review and edit the transcript before analysis, correct the suggested theme, or continue without AI. Our database does not retain AI request text, audio or transcripts; providers process them under their own terms and retention policies, potentially outside your country. Usage counters expire after two days and are removed on the next AI request. PDF exports are readable, unencrypted files. Encrypted backups require a recovery key; keep the recovery key separately. Losing the key or deleting the app may make local data unrecoverable.",
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
      "Grace & Gather is a spiritual wellbeing app, not therapy or emergency care. Journal entries are not monitored. Community harassment, hate, spam, unsafe medical advice and disclosure of another person’s private information are prohibited. Use Report or Block, or contact support. Resources and book suggestions do not promise recovery.",
    ],
    [
      "Questions and rights",
      "Contact Grace & Gather at hello@graceandgather.com to request help, access, correction or deletion of account data. You can export an encrypted local journal, delete entries and remove all device data in Account. This early-access policy must be reviewed against the final production providers and retention settings before public launch.",
    ],
  ],
  pt: [
    [
      "Discussões da comunidade",
      "A IA da comunidade está desativada no momento. Se ativada com aprovação específica, publicações, contexto e denúncias são verificados pelo Alibaba Cloud Qwen. O que passa na análise é publicado; casos incertos ou falhas continuam privados. A IA pode errar. Publicações retidas e contestações ficam sem publicação até haver revisão. Diário e perfil não são anexados. O provedor pode processar dados fora do país conforme sua política de retenção. Você pode denunciar, bloquear e excluir suas publicações. Não há monitoramento contínuo.",
    ],
    [
      "Confissões compartilhadas",
      "Compartilhar envia apenas o texto e áudio que você confirmar. Envios e respostas aguardam aprovação. Ouvintes veem temas e apoio solicitado; uma pessoa por vez pode abrir uma confissão por seis horas. Sem resposta, ela volta à lista. Uma única resposta fica visível para autor, ouvinte e moderadores autorizados. Nome e email ficam ocultos dos ouvintes; moderadores acessam envios e denúncias vinculados à conta. Voz e detalhes podem identificar você. Não é criptografia de ponta a ponta nem confissão sacramental. Denúncias ocultam conteúdo para revisão. Você pode encerrar respostas, bloquear e excluir a confissão e resposta. Registros de moderação ficam separados; contate o suporte para exclusão. Não há monitoramento em tempo real nem promessa de resposta imediata.",
    ],
    [
      "Seu diário privado",
      "Textos, sentimentos, reflexões e gravações ficam criptografados neste dispositivo. A chave fica no chaveiro seguro do aparelho. No navegador, o login, as preferências e as entradas enviadas são criptografados no IndexedDB local. A chave não exportável fica no mesmo navegador; isso não protege um navegador desbloqueado ou contra scripts maliciosos. As entradas enviadas são salvas automaticamente em Meu diário até você excluí-las. Limpar os dados do site remove o cofre. A orientação por IA começa ativada em novos perfis e pode ser desativada na configuração inicial ou nas Preferências. Quando ativada, enviar uma entrada compartilha seu texto e suas preferências de idioma e tradição pelo Supabase com o Alibaba Cloud Qwen para sugerir um versículo e uma ação. Enviar uma mensagem de chat também compartilha essa entrada e a conversa recente com o Qwen. Nada é enviado enquanto você digita. A gravação só é enviada ao Qwen quando você toca em Transcrever. Você pode revisar e editar a transcrição, corrigir o tema ou continuar sem IA. Nosso banco não armazena texto, áudio ou transcrições dessas solicitações; os provedores os processam conforme seus próprios termos e políticas de retenção, possivelmente fora do seu país. Os contadores de uso expiram após dois dias e são removidos na próxima solicitação de IA. Os PDFs são arquivos legíveis, não criptografados. Backups criptografados exigem uma chave; guarde a chave de recuperação separadamente. A perda da chave ou exclusão do app pode impedir a recuperação.",
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
      "Grace & Gather é um app de bem-estar espiritual, não terapia ou atendimento de emergência. O diário não é monitorado. Assédio, ódio, spam, orientações médicas perigosas e divulgação de informações privadas de terceiros são proibidos. Use Denunciar ou Bloquear, ou contate o suporte. Os recursos e livros não prometem recuperação.",
    ],
    [
      "Dúvidas e direitos",
      "Contate Grace & Gather em hello@graceandgather.com para solicitar ajuda, acesso, correção ou exclusão de dados. Em Conta, você pode exportar uma cópia criptografada ou excluir dados locais. Esta política inicial precisa ser revisada conforme os provedores e prazos de retenção finais antes do lançamento público.",
    ],
  ],
  es: [
    [
      "Conversaciones de la comunidad",
      "La IA de la comunidad está desactivada actualmente. Si se activa con aprobación específica, las publicaciones, el contexto y las denuncias se revisan con Alibaba Cloud Qwen. Lo que supera la revisión se publica; los casos inciertos o fallidos quedan privados. La IA puede equivocarse. Las publicaciones retenidas y apelaciones quedan sin publicar hasta disponer de revisión. No se adjuntan el diario ni el perfil. El proveedor puede procesar datos fuera de tu país según su política de retención. Puedes denunciar, bloquear y eliminar tus publicaciones. No hay supervisión continua.",
    ],
    [
      "Confesiones compartidas",
      "Compartir envía solo el texto y audio que confirmes. Envíos y respuestas esperan aprobación. Los oyentes ven temas y apoyo solicitado; una persona a la vez puede abrir una confesión por seis horas. Sin respuesta, vuelve a la lista. Una única respuesta es visible para autor, oyente y moderadores. Nombre y correo se ocultan a oyentes; los moderadores acceden a envíos y reportes vinculados a la cuenta. Voz y detalles pueden identificarte. No es cifrado de extremo a extremo ni confesión sacramental. Los reportes ocultan contenido para revisión. Puedes cerrar respuestas, bloquear o eliminar confesión y respuesta. Los registros de moderación se guardan aparte; contacta al soporte para borrarlos. No hay supervisión en tiempo real ni promesa de respuesta inmediata.",
    ],
    [
      "Tu diario privado",
      "Textos, sentimientos, reflexiones y grabaciones se cifran en tu dispositivo. La clave se guarda en su llavero seguro. En el navegador, la sesión, las preferencias y las entradas enviadas se cifran en IndexedDB local. La clave no exportable permanece en el mismo navegador; esto no protege un navegador desbloqueado ni contra scripts maliciosos. Las entradas enviadas se guardan automáticamente en Mi diario hasta que las elimines. Borrar los datos del sitio elimina la bóveda. La orientación con IA comienza activada en los perfiles nuevos y puede desactivarse durante la configuración inicial o en Preferencias. Mientras está activada, enviar una entrada comparte su texto y tus preferencias de idioma y tradición mediante Supabase con Alibaba Cloud Qwen para sugerir un versículo y una acción. Enviar un mensaje de chat también comparte esa entrada y la conversación reciente con Qwen. No se envía nada mientras escribes. La grabación solo se envía al pulsar Transcribir. Puedes revisar y editar la transcripción, corregir el tema o continuar sin IA. Nuestra base de datos no conserva texto, audio ni transcripciones de estas solicitudes; los proveedores los procesan según sus propios términos y políticas de retención, posiblemente fuera de tu país. Los contadores de uso caducan a los dos días y se eliminan en la siguiente solicitud de IA. Los PDF son archivos legibles sin cifrar. Las copias cifradas requieren una clave; guarda la clave de recuperación aparte. Perderla o borrar la app puede impedir recuperar los datos.",
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
      "Grace & Gather es una app de bienestar espiritual, no terapia ni atención de emergencia. No se supervisa el diario. Se prohíben acoso, odio, spam, consejos médicos peligrosos y datos privados ajenos. Usa Denunciar o Bloquear, o contacta con ayuda. Los recursos y libros no prometen recuperación.",
    ],
    [
      "Preguntas y derechos",
      "Contacta con Grace & Gather en hello@graceandgather.com para pedir ayuda, acceso, corrección o eliminación de datos. En Cuenta puedes exportar una copia cifrada o borrar datos locales. Esta política inicial debe revisarse según proveedores y retención finales antes del lanzamiento público.",
    ],
  ],
  ru: [
    [
      "Обсуждения сообщества",
      "ИИ сообщества сейчас отключён. При отдельном согласии на включение публикации, контекст и жалобы проверяет Alibaba Cloud Qwen. Прошедшие проверку записи публикуются; сомнительные записи и сбои оставляют их приватными. ИИ может ошибаться. Удержанные записи и обращения остаются неопубликованными до появления процедуры проверки. Дневник и профиль не прикрепляются. Провайдер может обрабатывать данные за пределами страны по своим правилам хранения. Можно жаловаться, блокировать людей и удалять свои записи. Непрерывного наблюдения нет.",
    ],
    [
      "Исповеди для слушателей",
      "Отправка загружает только подтверждённый вами текст и необязательное аудио. Исповеди и ответы ждут проверки. Слушатели видят тему и вид поддержки; один слушатель может открыть исповедь на шесть часов. Без ответа она возвращается в список. Единственный ответ виден автору, слушателю и модераторам. Имя и почта скрыты от слушателей; модераторы видят материалы и жалобы, связанные с аккаунтом. Голос и подробности могут раскрыть личность. Это не сквозное шифрование и не таинство исповеди. Жалобы скрывают материалы до проверки. Можно закрыть ответы, заблокировать человека или удалить исповедь и ответ. Журналы модерации хранятся отдельно; для удаления обратитесь в поддержку. Нет наблюдения в реальном времени или обещания немедленного ответа.",
    ],
    [
      "Личный дневник",
      "Текст, чувства, размышления и аудио хранятся на устройстве в зашифрованном виде. Ключ хранится в защищённой связке ключей. В браузере вход, настройки и отправленные записи хранятся в зашифрованном IndexedDB. Неэкспортируемый ключ хранится в том же браузере; это не защищает от доступа к разблокированному браузеру или вредоносного кода сайта. Отправленные записи автоматически сохраняются в дневнике, пока вы их не удалите. Очистка данных сайта удаляет локальное хранилище. Подсказки ИИ включены по умолчанию для новых профилей; их можно отключить при первом запуске или в настройках. Пока они включены, при отправке записи её текст, язык и христианская традиция передаются через Supabase в Alibaba Cloud Qwen для подбора стиха и действия. Отправка сообщения в чат также передаёт эту запись и недавнюю переписку в Qwen. Во время набора текста ничего не отправляется. Аудиозапись передаётся только по нажатию кнопки расшифровки. Можно проверить и изменить текст, исправить тему или продолжить без ИИ. Наша база не сохраняет текст, аудио и расшифровки этих запросов; провайдеры обрабатывают их по своим условиям и правилам хранения, возможно за пределами вашей страны. Счётчики использования истекают через два дня и удаляются при следующем запросе ИИ. PDF-файлы доступны для чтения и не зашифрованы. Для зашифрованных резервных копий нужен ключ; храните ключ восстановления отдельно. Утрата ключа или удаление приложения могут сделать данные недоступными.",
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
      "Grace & Gather помогает духовному благополучию и не заменяет терапию или экстренную помощь. Дневник не отслеживается. Запрещены травля, ненависть, спам, опасные медицинские советы и чужие личные данные. Используйте жалобу или блокировку либо обратитесь в поддержку. Материалы и книги не обещают выздоровления.",
    ],
    [
      "Вопросы и права",
      "Обратитесь в Grace & Gather по адресу hello@graceandgather.com для помощи, доступа, исправления или удаления данных. В аккаунте можно экспортировать зашифрованную копию или удалить данные устройства. Эту предварительную политику необходимо проверить с учётом окончательных провайдеров и сроков хранения перед публичным запуском.",
    ],
  ],
};
export default function Privacy() {
  const { profile } = useApp();
  return (
    <Screen back>
      <Heading>{label(profile.language, "privacy")}</Heading>
      <Body small>Grace & Gather · 10 November 2026</Body>
      <Card>
        <Subheading>{journalCopy(profile.language, "journal")}</Subheading>
        <Body>{journalCopy(profile.language, "archivedInfo")}</Body>
        <Body>{journalCopy(profile.language, "cleanupInfo")}</Body>
        <Body>{journalCopy(profile.language, "trashInfo")}</Body>
        <Body>{journalCopy(profile.language, "pdfInfo")}</Body>
        <Body>{journalCopy(profile.language, "backupInfo")}</Body>
      </Card>
      {policy[profile.language].map(([title, body]) => (
        <Card key={title}>
          <Subheading>{title}</Subheading>
          <Body>{body}</Body>
        </Card>
      ))}
      <Body>{copy(profile.language, "supportBoundary")}</Body>
      <External
        title="hello@graceandgather.com"
        url="mailto:hello@graceandgather.com"
      />
    </Screen>
  );
}
