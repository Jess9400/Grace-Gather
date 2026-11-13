import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { backend } from "../lib/backend";
import { useApp } from "../lib/state";
import { refreshPrayerBadges } from "../lib/prayers";
import { Body, Button, Card, Notice } from "./quiet-ui";

type Item = { id: string; kind: "confession_reply" | "discussion_reply"; target: string; is_read: boolean };
const words = {
  en: { confession: "Someone responded to your confession", discussion: "A discussion you joined has a new reply", moderation: "Items need moderation", open: "Open", admin: "Open moderation", unread: "Unread", error: "Some notifications could not load. Please try again later." },
  pt: { confession: "Alguém respondeu à sua confissão", discussion: "Uma conversa da qual você participa tem uma nova resposta", moderation: "Itens precisam de moderação", open: "Abrir", admin: "Abrir moderação", unread: "Não lida", error: "Não foi possível carregar algumas notificações. Tente novamente mais tarde." },
  es: { confession: "Alguien respondió a tu confesión", discussion: "Hay una nueva respuesta en una conversación en la que participas", moderation: "Hay elementos pendientes de moderación", open: "Abrir", admin: "Abrir moderación", unread: "Sin leer", error: "No se pudieron cargar algunas notificaciones. Inténtalo más tarde." },
  ru: { confession: "Кто-то ответил на вашу исповедь", discussion: "В обсуждении, в котором вы участвовали, появился новый ответ", moderation: "Материалы ожидают проверки", open: "Открыть", admin: "Открыть модерацию", unread: "Не прочитано", error: "Не удалось загрузить некоторые уведомления. Попробуйте позже." },
};
export default function ActivityNotices() {
  const { profile } = useApp();
  const t = words[profile.language];
  const [items, setItems] = useState<Item[]>([]);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    const load = () => {
      if (!backend) return;
      void Promise.resolve(backend.rpc("activity_snapshot")).then(({ data, error }) => {
        if (!active) return;
        setError(!!error);
        if (!error) { setItems(data?.items ?? []); setPending(Number(data?.pendingModeration) || 0); }
      }).catch(() => { if (active) setError(true); });
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []));
  return <>
    <Notice text={error ? t.error : ""} />
    {pending > 0 && <Card><Body>{t.moderation} · {pending}</Body><Button secondary title={t.admin} onPress={() => router.push("/admin")} /></Card>}
    {items.map(item => <Card key={item.id}>
      <Body>{item.kind === "confession_reply" ? t.confession : t.discussion}</Body>
      {!item.is_read && <Body small>{t.unread}</Body>}
      <Button secondary title={t.open} onPress={() => {
        if (backend) void Promise.resolve(backend.rpc("activity_mark_read", { p_id: item.id })).then(({ error }) => {
          if (!error) { setItems(old => old.map(x => x.id === item.id ? { ...x, is_read: true } : x)); refreshPrayerBadges(); }
        }).catch(() => {});
        if (item.kind === "confession_reply") router.push({ pathname: "/confession", params: { view: "mine" } });
        else router.push({ pathname: "/friends", params: { topic: item.target, from: "discover" } });
      }} />
    </Card>)}
  </>;
}
