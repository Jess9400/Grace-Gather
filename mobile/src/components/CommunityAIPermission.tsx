import { useEffect, useRef, useState } from "react";
import { backend } from "../lib/backend";
import type { Language } from "../lib/content";
import { Body, Button, Card, Notice, Subheading } from "./quiet-ui";

const words = {
  en: { title: "Community AI", info: "With your permission, an external AI service can translate and check your community posts, prayer requests and messages, including ones you already shared. If you decline, messages stay in their original language and posts go to human review. You can change this in Preferences. Provider details are in Privacy & support.", agree: "I agree", revoke: "Turn off community AI", enabled: "Community AI permitted", failed: "Couldn’t save your choice. Try again." },
  pt: { title: "IA da comunidade", info: "Com sua permissão, um serviço externo de IA pode traduzir e analisar suas publicações, pedidos de oração e mensagens, inclusive os já compartilhados. Se não concordar, as mensagens ficam no idioma original e as publicações vão para revisão humana. Você pode mudar em Preferências. Detalhes do provedor em Privacidade e suporte.", agree: "Concordo", revoke: "Desativar IA da comunidade", enabled: "IA da comunidade permitida", failed: "Não foi possível salvar sua escolha. Tente novamente." },
  es: { title: "IA de la comunidad", info: "Con tu permiso, un servicio externo de IA puede traducir y revisar tus publicaciones, peticiones de oración y mensajes, incluidos los ya compartidos. Si no aceptas, los mensajes quedan en su idioma original y las publicaciones pasan a revisión humana. Puedes cambiarlo en Preferencias. Consulta los detalles del proveedor en Privacidad y ayuda.", agree: "Acepto", revoke: "Desactivar IA de la comunidad", enabled: "IA de la comunidad permitida", failed: "No se pudo guardar tu elección. Inténtalo de nuevo." },
  ru: { title: "ИИ сообщества", info: "С вашего разрешения внешняя служба ИИ может переводить и проверять ваши публикации, молитвенные просьбы и сообщения, включая уже отправленные. Без согласия сообщения останутся на исходном языке, а публикации проверят модераторы. Вы можете изменить выбор в настройках. Сведения о провайдере — в разделе конфиденциальности.", agree: "Согласиться", revoke: "Отключить ИИ сообщества", enabled: "ИИ сообщества разрешён", failed: "Не удалось сохранить выбор. Попробуйте ещё раз." },
};

export default function CommunityAIPermission({ language }: { language: Language }) {
  const t = words[language], [allowed, setAllowed] = useState(false), [busy, setBusy] = useState(!!backend), [error, setError] = useState("");
  const owner = useRef<string | null>(null);
  useEffect(() => {
    let active = true, received = false, sequence = 0;
    if (!backend) return;
    const client = backend;
    function load(userId: string | null) {
      if (sequence > 0 && owner.current === userId) return;
      owner.current = userId;
      const request = ++sequence;
      setAllowed(false); setError(""); setBusy(!!userId);
      if (!userId) return;
      // Never await another Supabase call inside an auth callback.
      setTimeout(() => void Promise.resolve(client.rpc("ai_community_permission")).then((result) => {
        if (active && request === sequence) { setAllowed(result.data === true && !result.error); setBusy(false); }
      }).catch(() => { if (active && request === sequence) setBusy(false); }), 0);
    }
    void client.auth.getSession().then(({data}) => { if (active && !received) load(data.session?.user.id ?? null); });
    const subscription = client.auth.onAuthStateChange((_event, session) => { received = true; load(session?.user.id ?? null); });
    return () => { active = false; sequence++; owner.current = null; subscription.data.subscription.unsubscribe(); };
  }, []);
  async function change() {
    const expectedOwner = owner.current;
    if (!backend || busy || !expectedOwner) return;
    setBusy(true); setError("");
    try {
      const result = await backend.rpc("set_ai_community_permission", {p_allowed:!allowed,p_expected_user:expectedOwner});
      if (owner.current !== expectedOwner) return;
      if (result.error) setError(t.failed); else setAllowed(!allowed);
    } catch { if (owner.current === expectedOwner) setError(t.failed); }
    finally { if (owner.current === expectedOwner) setBusy(false); }
  }
  return <Card><Subheading>{t.title}</Subheading><Body small>{t.info}</Body>
    {allowed && <Body small>{t.enabled}</Body>}
    <Notice text={error} />
    <Button secondary title={allowed ? t.revoke : t.agree} disabled={busy} onPress={() => void change()} />
  </Card>;
}
