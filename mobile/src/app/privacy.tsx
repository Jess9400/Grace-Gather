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
      "ИИ для сообщества сейчас отключён. Если его включат с отдельного разрешения, публикации, контекст обсуждения и жалобы будут проверяться с помощью Alibaba Cloud Qwen. Публикации, прошедшие проверку, становятся видны; при сомнительном результате или сбое проверки они остаются скрытыми. ИИ может ошибаться. Задержанные публикации и обжалования не публикуются, пока не появится порядок их рассмотрения. Дневник и профиль к публикациям не прикрепляются. Провайдер может обрабатывать данные за пределами вашей страны по своим правилам хранения. Вы можете отправлять жалобы, блокировать людей и удалять свои публикации. Постоянное наблюдение не ведётся.",
    ],
    [
      "Исповеди и слушатели",
      "При отправке загружаются только текст и необязательное аудио, которые вы подтвердили. Исповеди и ответы ждут проверки. Слушатели видят тему и нужный вид поддержки; открыть исповедь может только один слушатель за раз, на шесть часов. Если ответа нет, исповедь возвращается в список. Возможен только один ответ; его видят автор, слушатель и модераторы. Имя и почта скрыты от слушателей, но модераторы видят материалы и жалобы, связанные с аккаунтом. Голос и подробности могут выдать вашу личность. Это не сквозное шифрование и не церковное таинство исповеди. После жалобы материалы скрываются до проверки. Можно закрыть ответы, заблокировать человека или удалить исповедь и ответ. Записи о модерации хранятся отдельно; по вопросам удаления обращайтесь в поддержку. Наблюдение в реальном времени не ведётся, немедленный ответ не обещается.",
    ],
    [
      "Личный дневник",
      "Текст, чувства, размышления и аудио хранятся на устройстве в зашифрованном виде. Ключ хранится в защищённой связке ключей устройства. В браузере вход, настройки и отправленные записи хранятся в зашифрованном виде в локальном хранилище IndexedDB. Неэкспортируемый ключ остаётся в том же браузере; это не защищает от доступа через разблокированный браузер и от вредоносного кода на сайте. Отправленные записи автоматически сохраняются в дневнике, пока вы их не удалите. Очистка данных сайта удаляет локальное хранилище. Подсказки ИИ включены по умолчанию для новых профилей; их можно отключить при первом запуске или в настройках. Пока они включены, при отправке записи её текст, язык и христианская традиция передаются через Supabase в Alibaba Cloud Qwen, чтобы подобрать стих и действие. При отправке сообщения в чат в Qwen также передаются эта запись и недавняя переписка. Пока вы набираете текст, ничего не отправляется. Аудиозапись передаётся, только когда вы нажимаете кнопку «Расшифровать». Можно проверить и исправить расшифровку, поправить тему или продолжить без ИИ. Наша база данных не хранит текст, аудио и расшифровки этих запросов; провайдеры обрабатывают их по своим условиям и правилам хранения, возможно за пределами вашей страны. Счётчики использования действуют два дня и удаляются при следующем запросе к ИИ. PDF-файлы открываются для чтения и не зашифрованы. Для зашифрованных резервных копий нужен ключ восстановления; храните его отдельно. Если вы потеряете ключ или удалите приложение, данные могут стать недоступными.",
    ],
    [
      "Аккаунт и сообщество",
      "Если вы создаёте аккаунт, Supabase обрабатывает адрес вашей почты и идентификаторы аккаунта. Синхронизация необязательна; она включает имя, город, язык, христианскую традицию и настройки уведомлений. Комментарии и публичное имя становятся видны после проверки. Отметки «нравится», записи на встречи, жалобы и блокировки хранятся отдельно от дневника. Аккаунт можно удалить в настройках. Дневник на устройстве удаляется отдельно. Служебные резервные копии могут храниться в течение срока, установленного у провайдера.",
    ],
    [
      "Ваш выбор",
      "Доступ к микрофону запрашивается, когда вы начинаете запись. Для напоминаний и уведомлений нужно ваше разрешение. Для писем нужны согласие и подтверждённый адрес; в этой версии письма не отправляются. Точная геолокация, рекламный идентификатор и контакты не запрашиваются. У внешних сайтов свои политики конфиденциальности. Аудиовстречи, если они подключены, проходят через LiveKit; другие участники слышат всё, что вы решите сказать.",
    ],
    [
      "Забота и модерация",
      "Grace & Gather — приложение для духовного благополучия, а не психотерапия и не экстренная помощь. Записи в дневнике никто не отслеживает. Запрещены травля, ненависть, спам, опасные медицинские советы и разглашение чужих личных данных. Используйте жалобу или блокировку либо обратитесь в поддержку. Материалы и книги не обещают выздоровления.",
    ],
    [
      "Вопросы и ваши права",
      "Чтобы получить помощь, доступ к данным, исправить или удалить их, напишите в Grace & Gather по адресу hello@graceandgather.com. В разделе «Аккаунт» можно экспортировать зашифрованную копию или удалить данные с устройства. Это предварительная версия политики: перед публичным запуском её нужно сверить с окончательным выбором провайдеров и сроками хранения.",
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
