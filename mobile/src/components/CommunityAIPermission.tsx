import { useEffect, useRef, useState } from "react";
import { backend } from "../lib/backend";
import type { Language } from "../lib/content";
import { Body, Button, Card, Notice, Subheading } from "./quiet-ui";

const words = {
  en: { title: "Community AI", info: "With your permission, your posts, prayer requests and messages, including earlier ones, may be sent through Supabase to our AI provider, Alibaba Cloud, for translation and safety checks. If you decline, content stays in its original language and posts go to human review. You can change this in Preferences.", agree: "I agree", revoke: "Turn off community AI", enabled: "Community AI permitted", failed: "Couldn’t save your choice. Try again." },
  pt: { title: "IA da comunidade", info: "Com sua permissão, suas publicações, pedidos de oração e mensagens, inclusive os anteriores, podem ser enviados pelo Supabase ao nosso provedor de IA, Alibaba Cloud, para tradução e análise de segurança. Sem permissão, o conteúdo fica no idioma original e as publicações vão para revisão humana. Você pode mudar em Preferências.", agree: "Concordo", revoke: "Desativar IA da comunidade", enabled: "IA da comunidade permitida", failed: "Não foi possível salvar sua escolha. Tente novamente." },
  es: { title: "IA de la comunidad", info: "Con tu permiso, tus publicaciones, peticiones de oración y mensajes, incluidos los anteriores, pueden enviarse mediante Supabase a nuestro proveedor de IA, Alibaba Cloud, para traducción y revisión de seguridad. Sin permiso, el contenido queda en su idioma original y las publicaciones pasan a revisión humana. Puedes cambiarlo en Preferencias.", agree: "Acepto", revoke: "Desactivar IA de la comunidad", enabled: "IA de la comunidad permitida", failed: "No se pudo guardar tu elección. Inténtalo de nuevo." },
  ru: { title: "ИИ сообщества", info: "С вашего разрешения публикации, молитвенные просьбы и сообщения, включая предыдущие, могут отправляться через Supabase нашему провайдеру ИИ Alibaba Cloud для перевода и проверки безопасности. Без разрешения текст останется на исходном языке, а публикации проверят модераторы. Вы можете изменить выбор в настройках.", agree: "Согласиться", revoke: "Отключить ИИ сообщества", enabled: "ИИ сообщества разрешён", failed: "Не удалось сохранить выбор. Попробуйте ещё раз." },
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
