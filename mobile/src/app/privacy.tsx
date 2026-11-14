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
      "Community posts and comments are visible to other members after review. If you agree to community AI, your posts, prayer requests and messages, including earlier ones, may be sent through Supabase to our external AI provider, Alibaba Cloud, for safety screening and translation. Translations are requested only when both the author and the viewer have agreed. Without permission, content remains in its original language and posts go to human review. You can change your choice in Preferences. AI can make mistakes; uncertain cases go to moderators.",
    ],
    [
      "Confessions shared with listeners",
      "Sharing a confession uploads only the text and optional audio you explicitly submit. All submissions and responses wait for moderator approval. Listeners see themes and requested support; one listener at a time can open a confession for six hours. Without a response, it returns to the list. Only one comfort response is permitted and is visible to the writer, listener and authorized moderators. Names and emails are hidden from listeners, but moderators can access account-linked submissions and reports. A voice or the details you write may identify you. This is not end-to-end encryption or sacramental confession. Reports hide content pending review. You can close replies, block a person, or delete your confession and response. Moderation records are stored separately; contact support for deletion requests. No real-time monitoring or immediate reply is promised.",
    ],
    [
      "Your private journal",
      "Your submitted journal entries, reflections, conversations and recordings are saved to your account in Supabase and can be accessed on your signed-in devices. Access is restricted to your account, but the service can process the data: it is not end-to-end encrypted. A device copy is encrypted locally. Older on-device entries are added only when you choose. Deleting your account deletes its synced journal; separate device copies must be removed on that device. PDF exports are readable, while encrypted backups require their recovery key. AI guidance is optional and requires your agreement. If enabled, the journal text, Bible study questions, recent conversation and language and tradition preferences are sent through Supabase to our external AI provider, Alibaba Cloud, to produce a response. A recording is sent only when you request transcription. Processing may occur outside your country. You can withdraw permission in Preferences.",
    ],
    [
      "Your account and community",
      "Supabase processes your sign-in email and account identifiers. Your profile and community activity are stored separately from your journal. Account deletion removes the synced journal, profile and linked community records. Separately stored device copies must be deleted on the device. Operational backups may remain for the provider’s configured retention period.",
    ],
    [
      "Your choices",
      "Microphone access is requested when you record. Local reminders and gathering push notifications require permission. Optional email updates require consent and a verified address. No precise location, advertising identifier or contact list is requested. External publishers and charities apply their own privacy policies. Audio gatherings, when configured, use LiveKit; other participants can hear anything you choose to say.",
    ],
    [
      "Care and moderation",
      "Grace & Gather is a spiritual wellbeing app, not therapy or emergency care. Journal entries are not monitored. Community harassment, hate, spam, unsafe medical advice and disclosure of another person’s private information are prohibited. Use Report or Block, or contact support. Resources and book suggestions do not promise recovery.",
    ],
    [
      "Questions and rights",
      "Contact Grace & Gather at hello@graceandgather.online to request help, access, correction or deletion of account data. You can export an encrypted local journal, delete entries and remove all device data in Account. This early-access policy must be reviewed against the final production providers and retention settings before public launch.",
    ],
  ],
  pt: [
    [
      "Discussões da comunidade",
      "Publicações e comentários ficam visíveis aos membros após revisão. Se você permitir a IA da comunidade, suas publicações, pedidos de oração e mensagens, inclusive os anteriores, podem ser enviados pelo Supabase ao nosso provedor externo de IA, Alibaba Cloud, para análise de segurança e tradução. As traduções são solicitadas apenas quando autor e leitor concordam. Sem permissão, o conteúdo fica no idioma original e as publicações vão para revisão humana. Você pode mudar sua escolha em Preferências. A IA pode errar; casos incertos vão aos moderadores.",
    ],
    [
      "Confissões compartilhadas",
      "Compartilhar envia apenas o texto e áudio que você confirmar. Envios e respostas aguardam aprovação. Ouvintes veem temas e apoio solicitado; uma pessoa por vez pode abrir uma confissão por seis horas. Sem resposta, ela volta à lista. Uma única resposta fica visível para autor, ouvinte e moderadores autorizados. Nome e email ficam ocultos dos ouvintes; moderadores acessam envios e denúncias vinculados à conta. Voz e detalhes podem identificar você. Não é criptografia de ponta a ponta nem confissão sacramental. Denúncias ocultam conteúdo para revisão. Você pode encerrar respostas, bloquear e excluir a confissão e resposta. Registros de moderação ficam separados; contate o suporte para exclusão. Não há monitoramento em tempo real nem promessa de resposta imediata.",
    ],
    [
      "Seu diário privado",
      "Suas entradas, reflexões, conversas e gravações enviadas são salvas na sua conta no Supabase e podem ser acessadas nos seus aparelhos conectados. O acesso é restrito à sua conta, mas o serviço pode processar os dados: não há criptografia de ponta a ponta. Uma cópia é criptografada no aparelho. Entradas antigas deste aparelho só são adicionadas se você escolher. Excluir a conta exclui o diário sincronizado; cópias separadas devem ser apagadas no aparelho. PDFs são legíveis; cópias criptografadas exigem a chave de recuperação. A orientação por IA é opcional e requer sua concordância. Quando ativada, o texto do diário, perguntas sobre a Bíblia, a conversa recente e as preferências de idioma e tradição são enviados pelo Supabase ao nosso provedor externo de IA, Alibaba Cloud, para gerar uma resposta. Um áudio só é enviado quando você pede a transcrição. O processamento pode ocorrer fora do seu país. Você pode retirar sua permissão em Preferências.",
    ],
    [
      "Sua conta e comunidade",
      "O Supabase processa seu email e identificadores de acesso. Seu perfil e suas atividades na comunidade ficam separados do diário. A exclusão da conta remove o diário sincronizado, o perfil e os registros vinculados da comunidade. Cópias separadas precisam ser apagadas no aparelho. Cópias operacionais podem permanecer pelo prazo configurado no provedor.",
    ],
    [
      "Suas escolhas",
      "Pedimos acesso ao microfone ao gravar. Lembretes e notificações exigem permissão. Atualizações opcionais por email exigem consentimento e endereço verificado. Não solicitamos localização precisa, identificador de publicidade ou contatos. Sites externos têm suas próprias políticas. Encontros de áudio, quando configurados, usam LiveKit; outros participantes ouvem o que você decidir compartilhar.",
    ],
    [
      "Cuidado e moderação",
      "Grace & Gather é um app de bem-estar espiritual, não terapia ou atendimento de emergência. O diário não é monitorado. Assédio, ódio, spam, orientações médicas perigosas e divulgação de informações privadas de terceiros são proibidos. Use Denunciar ou Bloquear, ou contate o suporte. Os recursos e livros não prometem recuperação.",
    ],
    [
      "Dúvidas e direitos",
      "Contate Grace & Gather em hello@graceandgather.online para solicitar ajuda, acesso, correção ou exclusão de dados. Em Conta, você pode exportar uma cópia criptografada ou excluir dados locais. Esta política inicial precisa ser revisada conforme os provedores e prazos de retenção finais antes do lançamento público.",
    ],
  ],
  es: [
    [
      "Conversaciones de la comunidad",
      "Las publicaciones y comentarios son visibles para los miembros tras su revisión. Si aceptas la IA de la comunidad, tus publicaciones, peticiones de oración y mensajes, incluidos los anteriores, pueden enviarse mediante Supabase a nuestro proveedor externo de IA, Alibaba Cloud, para revisión de seguridad y traducción. Las traducciones solo se solicitan si autor y lector han dado su permiso. Sin permiso, el contenido queda en su idioma original y las publicaciones pasan a revisión humana. Puedes cambiar tu elección en Preferencias. La IA puede equivocarse; los casos dudosos pasan a moderadores.",
    ],
    [
      "Confesiones compartidas",
      "Compartir envía solo el texto y audio que confirmes. Envíos y respuestas esperan aprobación. Los oyentes ven temas y apoyo solicitado; una persona a la vez puede abrir una confesión por seis horas. Sin respuesta, vuelve a la lista. Una única respuesta es visible para autor, oyente y moderadores. Nombre y correo se ocultan a oyentes; los moderadores acceden a envíos y reportes vinculados a la cuenta. Voz y detalles pueden identificarte. No es cifrado de extremo a extremo ni confesión sacramental. Los reportes ocultan contenido para revisión. Puedes cerrar respuestas, bloquear o eliminar confesión y respuesta. Los registros de moderación se guardan aparte; contacta al soporte para borrarlos. No hay supervisión en tiempo real ni promesa de respuesta inmediata.",
    ],
    [
      "Tu diario privado",
      "Tus entradas enviadas, reflexiones, conversaciones y grabaciones se guardan en tu cuenta de Supabase y se sincronizan con tus dispositivos conectados. El acceso está limitado a tu cuenta, pero el servicio puede procesar los datos: no hay cifrado de extremo a extremo. Una copia se cifra en el dispositivo. Las entradas anteriores solo se añaden si lo eliges. Al eliminar la cuenta se elimina el diario sincronizado; las copias separadas se borran en el dispositivo. Los PDF son legibles; las copias cifradas requieren su clave. La orientación con IA es opcional y requiere tu consentimiento. Al activarla, el texto del diario, las preguntas bíblicas, la conversación reciente y tus preferencias de idioma y tradición se envían mediante Supabase a nuestro proveedor externo de IA, Alibaba Cloud. El audio solo se envía si solicitas transcripción. El procesamiento puede ocurrir fuera de tu país. Puedes retirar tu permiso en Preferencias.",
    ],
    [
      "Tu cuenta y comunidad",
      "Supabase procesa tu correo e identificadores de acceso. Tu perfil y actividad comunitaria se guardan separados del diario. Eliminar la cuenta elimina el diario sincronizado, el perfil y los registros comunitarios vinculados. Las copias separadas deben borrarse en el dispositivo. Las copias operativas pueden permanecer durante el plazo configurado por el proveedor.",
    ],
    [
      "Tus decisiones",
      "Pedimos permiso de micrófono al grabar. Recordatorios y notificaciones requieren permiso. Las novedades opcionales por correo requieren consentimiento y una dirección verificada. No pedimos ubicación precisa, identificador publicitario ni contactos. Los sitios externos tienen sus propias políticas. Las reuniones de audio usan LiveKit cuando está configurado; los participantes oyen lo que decidas compartir.",
    ],
    [
      "Cuidado y moderación",
      "Grace & Gather es una app de bienestar espiritual, no terapia ni atención de emergencia. No se supervisa el diario. Se prohíben acoso, odio, spam, consejos médicos peligrosos y datos privados ajenos. Usa Denunciar o Bloquear, o contacta con ayuda. Los recursos y libros no prometen recuperación.",
    ],
    [
      "Preguntas y derechos",
      "Contacta con Grace & Gather en hello@graceandgather.online para pedir ayuda, acceso, corrección o eliminación de datos. En Cuenta puedes exportar una copia cifrada o borrar datos locales. Esta política inicial debe revisarse según proveedores y retención finales antes del lanzamiento público.",
    ],
  ],
  ru: [
    [
      "Обсуждения сообщества",
      "Публикации и комментарии видны участникам после проверки. Если вы разрешите ИИ сообщества, ваши публикации, молитвенные просьбы и сообщения, включая предыдущие, могут отправляться через Supabase внешнему провайдеру ИИ Alibaba Cloud для проверки безопасности и перевода. Перевод запрашивается только с согласия автора и читателя. Без согласия текст остаётся на исходном языке, а публикации проверяются модераторами. Вы можете изменить выбор в настройках. ИИ может ошибаться; сомнительные случаи рассматривают модераторы.",
    ],
    [
      "Исповеди и слушатели",
      "При отправке загружаются только текст и необязательное аудио, которые вы подтвердили. Исповеди и ответы ждут проверки. Слушатели видят тему и нужный вид поддержки; открыть исповедь может только один слушатель за раз, на шесть часов. Если ответа нет, исповедь возвращается в список. Возможен только один ответ; его видят автор, слушатель и модераторы. Имя и почта скрыты от слушателей, но модераторы видят материалы и жалобы, связанные с аккаунтом. Голос и подробности могут выдать вашу личность. Это не сквозное шифрование и не церковное таинство исповеди. После жалобы материалы скрываются до проверки. Можно закрыть ответы, заблокировать человека или удалить исповедь и ответ. Записи о модерации хранятся отдельно; по вопросам удаления обращайтесь в поддержку. Наблюдение в реальном времени не ведётся, немедленный ответ не обещается.",
    ],
    [
      "Личный дневник",
      "Отправленные записи, размышления, разговоры и аудио сохраняются в вашей учётной записи Supabase и доступны на ваших устройствах. Доступ ограничен вашей учётной записью, но сервис может обрабатывать данные: сквозное шифрование не используется. Копия на устройстве зашифрована. Старые записи устройства добавляются только по вашему выбору. При удалении аккаунта синхронизированный дневник удаляется; отдельные копии удаляются на устройстве. PDF-файлы читаемы; для зашифрованной резервной копии нужен ключ. Подсказки ИИ необязательны и требуют вашего согласия. При включении текст дневника, вопросы о Библии, недавний разговор и настройки языка и традиции отправляются через Supabase внешнему провайдеру ИИ Alibaba Cloud. Аудио отправляется только по запросу расшифровки. Обработка может происходить за пределами вашей страны. Согласие можно отозвать в настройках.",
    ],
    [
      "Аккаунт и сообщество",
      "Supabase обрабатывает адрес электронной почты и идентификаторы входа. Профиль и действия в сообществе хранятся отдельно от дневника. Удаление аккаунта удаляет синхронизированный дневник, профиль и связанные записи сообщества. Отдельные копии необходимо удалить на устройстве. Операционные резервные копии могут храниться в течение срока, установленного провайдером.",
    ],
    [
      "Ваш выбор",
      "Доступ к микрофону запрашивается, когда вы начинаете запись. Для напоминаний и уведомлений нужно ваше разрешение. Для необязательных писем нужны согласие и подтверждённый адрес. Точная геолокация, рекламный идентификатор и контакты не запрашиваются. У внешних сайтов свои политики конфиденциальности. Аудиовстречи, если они подключены, проходят через LiveKit; другие участники слышат всё, что вы решите сказать.",
    ],
    [
      "Забота и модерация",
      "Grace & Gather — приложение для духовного благополучия, а не психотерапия и не экстренная помощь. Записи в дневнике никто не отслеживает. Запрещены травля, ненависть, спам, опасные медицинские советы и разглашение чужих личных данных. Используйте жалобу или блокировку либо обратитесь в поддержку. Материалы и книги не обещают выздоровления.",
    ],
    [
      "Вопросы и ваши права",
      "Чтобы получить помощь, доступ к данным, исправить или удалить их, напишите в Grace & Gather по адресу hello@graceandgather.online. В разделе «Аккаунт» можно экспортировать зашифрованную копию или удалить данные с устройства. Это предварительная версия политики: перед публичным запуском её нужно сверить с окончательным выбором провайдеров и сроками хранения.",
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
        title="hello@graceandgather.online"
        url="mailto:hello@graceandgather.online"
      />
    </Screen>
  );
}
