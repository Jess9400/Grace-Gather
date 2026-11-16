import { router } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Button,
  Card,
  Subheading,
  External,
} from "../components/quiet-ui";
import { useApp } from "../lib/state";
import { label } from "../lib/labels";
import { termsCopy } from "../lib/terms-copy";

// The Terms of Use everyone agrees to before entering the church. Each
// section is a title and one paragraph; scripts/build-support-pages.mjs also
// publishes them as terms.html on the website. Keep the four languages saying
// the same thing.
const terms = {
  en: [
    [
      "Agreement",
      "By creating an account or using Grace & Gather, you agree to these Terms of Use and to our Privacy Policy. If you downloaded the app from the App Store, Apple's standard Licensed Application End User License Agreement also applies.",
    ],
    [
      "What Grace & Gather is",
      "Grace & Gather is a place for prayer, Bible reading, reflection and gentle community. It is not therapy, medical advice or an emergency service. If you or someone else is in danger, contact local emergency services; the Help page lists crisis lines.",
    ],
    [
      "No tolerance for objectionable content or abusive users",
      "There is no tolerance for objectionable content or abusive behaviour. Do not post, say or send harassment, bullying, threats, hate, sexual content, violence, encouragement of self-harm, spam or scams, unsafe medical advice, or anyone's private information. Treat people of every tradition, and of none, with respect.",
    ],
    [
      "How sharing is kept safe",
      "Posts, replies, prayer requests and stories are checked before others see them, by our moderators or, when you allow it, by an automatic AI review. You can report anything that worries you and block people you no longer want to hear from.",
    ],
    [
      "What we do about reports",
      "We review reports within 24 hours. We remove content that breaks these terms and suspend or remove the accounts of people who post it.",
    ],
    [
      "Your content",
      "What you write remains yours. You allow us to show it to the people you chose to share it with. You can delete it, and we may remove anything that breaks these terms. Your private journal is never shared.",
    ],
    [
      "Your account",
      "Keep your sign-in to yourself and use the app only for its purpose. You can delete your account at any time in Profile. We may suspend or close an account that breaks these terms.",
    ],
    [
      "Questions",
      "Write to hello@graceandgather.online. We may update these terms; when we do, we will ask you to agree again before you continue.",
    ],
  ],
  pt: [
    [
      "Acordo",
      "Ao criar uma conta ou usar o Grace & Gather, você concorda com estes Termos de Uso e com a nossa Política de Privacidade. Se você baixou o app na App Store, também se aplica o Contrato de Licença de Usuário Final padrão da Apple.",
    ],
    [
      "O que é o Grace & Gather",
      "O Grace & Gather é um lugar de oração, leitura da Bíblia, reflexão e comunidade acolhedora. Não é terapia, aconselhamento médico nem serviço de emergência. Se você ou outra pessoa estiver em perigo, procure os serviços de emergência locais; a página Ajuda lista linhas de apoio.",
    ],
    [
      "Nenhuma tolerância a conteúdo ofensivo ou usuários abusivos",
      "Não há nenhuma tolerância a conteúdo ofensivo ou comportamento abusivo. Não publique, diga ou envie assédio, intimidação, ameaças, ódio, conteúdo sexual, violência, incentivo à automutilação, spam ou golpes, conselhos médicos perigosos ou informações privadas de qualquer pessoa. Trate com respeito pessoas de todas as tradições, e também quem não tem nenhuma.",
    ],
    [
      "Como o compartilhamento é protegido",
      "Publicações, respostas, pedidos de oração e histórias são verificados antes que outras pessoas os vejam, pelos nossos moderadores ou, quando você permite, por uma revisão automática com IA. Você pode denunciar tudo o que o preocupar e bloquear quem não quiser mais ouvir.",
    ],
    [
      "O que fazemos com as denúncias",
      "Analisamos as denúncias em até 24 horas. Removemos o conteúdo que viola estes termos e suspendemos ou removemos as contas de quem o publica.",
    ],
    [
      "Seu conteúdo",
      "O que você escreve continua sendo seu. Você nos permite mostrá-lo às pessoas com quem escolheu compartilhar. Você pode excluí-lo, e podemos remover o que violar estes termos. Seu diário privado nunca é compartilhado.",
    ],
    [
      "Sua conta",
      "Não compartilhe seu acesso e use o app apenas para a sua finalidade. Você pode excluir sua conta a qualquer momento em Perfil. Podemos suspender ou encerrar uma conta que viole estes termos.",
    ],
    [
      "Dúvidas",
      "Escreva para hello@graceandgather.online. Podemos atualizar estes termos; quando isso acontecer, pediremos que você concorde novamente antes de continuar.",
    ],
  ],
  es: [
    [
      "Acuerdo",
      "Al crear una cuenta o usar Grace & Gather, aceptas estos Términos de Uso y nuestra Política de Privacidad. Si descargaste la app en la App Store, también se aplica el Contrato de Licencia de Usuario Final estándar de Apple.",
    ],
    [
      "Qué es Grace & Gather",
      "Grace & Gather es un lugar de oración, lectura de la Biblia, reflexión y comunidad acogedora. No es terapia, consejo médico ni un servicio de emergencias. Si tú u otra persona están en peligro, contacta con los servicios de emergencia locales; la página Ayuda incluye líneas de apoyo.",
    ],
    [
      "Ninguna tolerancia al contenido ofensivo ni a los usuarios abusivos",
      "No hay ninguna tolerancia al contenido ofensivo ni al comportamiento abusivo. No publiques, digas ni envíes acoso, intimidación, amenazas, odio, contenido sexual, violencia, incitación a autolesionarse, spam o estafas, consejos médicos peligrosos ni información privada de nadie. Trata con respeto a las personas de todas las tradiciones, y también a quienes no tienen ninguna.",
    ],
    [
      "Cómo se protege lo que se comparte",
      "Las publicaciones, respuestas, peticiones de oración e historias se revisan antes de que otros las vean, por nuestros moderadores o, si lo permites, por una revisión automática con IA. Puedes denunciar todo lo que te preocupe y bloquear a quien ya no quieras escuchar.",
    ],
    [
      "Qué hacemos con las denuncias",
      "Revisamos las denuncias en un plazo de 24 horas. Eliminamos el contenido que incumple estos términos y suspendemos o eliminamos las cuentas de quienes lo publican.",
    ],
    [
      "Tu contenido",
      "Lo que escribes sigue siendo tuyo. Nos permites mostrarlo a las personas con quienes elegiste compartirlo. Puedes borrarlo, y podemos eliminar lo que incumpla estos términos. Tu diario privado nunca se comparte.",
    ],
    [
      "Tu cuenta",
      "No compartas tu acceso y usa la app solo para su finalidad. Puedes eliminar tu cuenta en cualquier momento en Perfil. Podemos suspender o cerrar una cuenta que incumpla estos términos.",
    ],
    [
      "Preguntas",
      "Escribe a hello@graceandgather.online. Podemos actualizar estos términos; cuando lo hagamos, te pediremos que los aceptes de nuevo antes de continuar.",
    ],
  ],
  ru: [
    [
      "Соглашение",
      "Создавая аккаунт или пользуясь Grace & Gather, вы принимаете эти Условия использования и нашу Политику конфиденциальности. Если вы скачали приложение в App Store, также действует стандартное лицензионное соглашение Apple с конечным пользователем.",
    ],
    [
      "Что такое Grace & Gather",
      "Grace & Gather — место для молитвы, чтения Библии, размышлений и бережного общения. Это не психотерапия, не медицинская консультация и не экстренная служба. Если вам или кому-то другому грозит опасность, обратитесь в местные экстренные службы; на странице «Помощь» есть телефоны доверия.",
    ],
    [
      "Никакой терпимости к недопустимому контенту и оскорбительному поведению",
      "Мы не терпим недопустимый контент и оскорбительное поведение. Не публикуйте, не говорите и не отправляйте травлю, запугивание, угрозы, ненависть, сексуальный контент, насилие, призывы к самоповреждению, спам или мошенничество, опасные медицинские советы и чужие личные данные. Относитесь с уважением к людям любой традиции и к тем, у кого её нет.",
    ],
    [
      "Как мы оберегаем общение",
      "Публикации, ответы, просьбы о молитве и истории проверяются, прежде чем их увидят другие: нашими модераторами или, если вы разрешите, автоматической проверкой с помощью ИИ. Вы можете пожаловаться на всё, что вас тревожит, и заблокировать тех, кого больше не хотите слышать.",
    ],
    [
      "Что мы делаем с жалобами",
      "Мы рассматриваем жалобы в течение 24 часов. Мы удаляем контент, нарушающий эти условия, и приостанавливаем или удаляем аккаунты тех, кто его публикует.",
    ],
    [
      "Ваш контент",
      "Всё, что вы пишете, остаётся вашим. Вы разрешаете нам показывать это тем, с кем вы решили поделиться. Вы можете это удалить, а мы можем удалить всё, что нарушает эти условия. Ваш личный дневник никогда не публикуется.",
    ],
    [
      "Ваш аккаунт",
      "Никому не передавайте доступ и используйте приложение только по назначению. Вы можете удалить аккаунт в любой момент в разделе «Профиль». Мы можем приостановить или закрыть аккаунт, нарушающий эти условия.",
    ],
    [
      "Вопросы",
      "Пишите на hello@graceandgather.online. Мы можем обновлять эти условия; в таком случае мы попросим вас принять их снова, прежде чем вы продолжите.",
    ],
  ],
};
export default function Terms() {
  const { profile } = useApp();
  const language = profile.language;
  return (
    <Screen back>
      <Heading>{(termsCopy[language] ?? termsCopy.en).title}</Heading>
      <Body small>Grace & Gather · 16 November 2026</Body>
      {(terms[language] ?? terms.en).map(([heading, body]) => (
        <Card key={heading}>
          <Subheading>{heading}</Subheading>
          <Body>{body}</Body>
        </Card>
      ))}
      <Button
        secondary
        title={label(language, "privacy")}
        onPress={() => router.push("/privacy")}
      />
      <External
        title="hello@graceandgather.online"
        url="mailto:hello@graceandgather.online"
      />
    </Screen>
  );
}
