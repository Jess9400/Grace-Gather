import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { backend } from "../lib/backend";
import { useApp } from "../lib/state";
import { refreshPrayerBadges } from "../lib/prayers";
import { Body, Button, Card, Notice } from "./quiet-ui";
import { isProtestant } from "../lib/church-calendar";
import { Ionicons } from "@expo/vector-icons";
import { activityDestination, groupUnreadActivity, type ActivityItem } from "../lib/activity-notices";

const words = {
  en: {
    confession: "Someone responded to your confession",
    discussion: "A discussion you joined has a new reply",
    moderation: "Items need moderation",
    open: "Open",
    admin: "Open moderation",
    unread: "Unread",
    error: "Some notifications could not load. Please try again later.",
  },
  pt: {
    confession: "Alguém respondeu à sua confissão",
    discussion: "Uma conversa da qual você participa tem uma nova resposta",
    moderation: "Itens precisam de moderação",
    open: "Abrir",
    admin: "Abrir moderação",
    unread: "Não lida",
    error:
      "Não foi possível carregar algumas notificações. Tente novamente mais tarde.",
  },
  es: {
    confession: "Alguien respondió a tu confesión",
    discussion:
      "Hay una nueva respuesta en una conversación en la que participas",
    moderation: "Hay elementos pendientes de moderación",
    open: "Abrir",
    admin: "Abrir moderación",
    unread: "Sin leer",
    error: "No se pudieron cargar algunas notificaciones. Inténtalo más tarde.",
  },
  ru: {
    confession: "Кто-то ответил на вашу исповедь",
    discussion: "В обсуждении, в котором вы участвовали, появился новый ответ",
    moderation: "Материалы ожидают проверки",
    open: "Открыть",
    admin: "Открыть модерацию",
    unread: "Не прочитано",
    error: "Не удалось загрузить некоторые уведомления. Попробуйте позже.",
  },
};
export default function ActivityNotices({
  onLoadError,
  retry = 0,
}: {
  onLoadError?: (failed: boolean) => void;
  retry?: number;
}) {
  const { profile } = useApp();
  const t = words[profile.language];
  const burdenReply = {
    en: "Someone responded to your burden",
    pt: "Alguém respondeu ao seu desabafo",
    es: "Alguien respondió a tu desahogo",
    ru: "Кто-то ответил на ваше сообщение",
  }[profile.language];
  const thanks = {
    en: "Someone thanked you for offering comfort",
    pt: "Alguém agradeceu pelo conforto que você ofereceu",
    es: "Alguien te agradeció el consuelo que ofreciste",
    ru: "Вас поблагодарили за поддержку",
  }[profile.language];
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [opening, setOpening] = useState(false);
  const loadVersion = useRef(0);
  const [pending, setPending] = useState(0);
  const [staff, setStaff] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    onLoadError?.(error);
  }, [error, onLoadError]);
  useFocusEffect(
    useCallback(() => {
      void retry; // A retry remounts this focus subscription and fetches again.
      let active = true;
      const load = () => {
        if (!backend) return;
        const version = ++loadVersion.current;
        void Promise.resolve(backend.rpc("activity_snapshot_v2"))
          .then((result) => result.error?.code === "PGRST202" ? backend!.rpc("activity_snapshot") : result)
          .then(({ data, error }) => {
            if (!active || version !== loadVersion.current) return;
            setError(!!error);
            if (!error) {
              setItems(data?.items ?? []);
              setPending(Number(data?.pendingModeration) || 0);
            }
          })
          .catch(() => {
            if (active && version === loadVersion.current) setError(true);
          });
      };
      if (backend)
        void Promise.resolve(backend.rpc("staff_role"))
          .then(({ data, error }) => {
            if (active)
              setStaff(!error && (data === "admin" || data === "moderator"));
          })
          .catch(() => {
            if (active) setStaff(false);
          });
      load();
      const timer = setInterval(load, 30000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [retry]),
  );
  const groups = groupUnreadActivity(items);
  async function openActivity(item: ActivityItem, ids: string[]) {
    if (!backend || opening) return;
    setOpening(true);
    loadVersion.current++;
    try {
      const results = await Promise.all(ids.map((id) => backend!.rpc("activity_mark_read", { p_id: id })));
      if (results.some((result) => result.error)) throw Error("mark_read_failed");
      loadVersion.current++;
      setItems((old) => old.filter((value) => !ids.includes(value.id)));
      setError(false);
      refreshPrayerBadges();
      router.push(activityDestination(item));
    } catch {
      setError(true);
    } finally {
      setOpening(false);
    }
  }
  return (
    <>
      {!onLoadError && <Notice text={error ? t.error : ""} />}
      {(staff || pending > 0) && (
        <Card>
          <Body small>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              accessible={false}
            />
            {"  "}
            {
              {
                en: "Moderation",
                pt: "Moderação",
                es: "Moderación",
                ru: "Модерация",
              }[profile.language]
            }
          </Body>
          {pending > 0 && (
            <Body>
              {t.moderation} · {pending}
            </Body>
          )}
          <Button
            secondary
            title={t.admin}
            onPress={() => router.push("/admin")}
          />
        </Card>
      )}
      {groups.map(({ item, ids }) => (
        <Card key={item.id}>
          <Body small>
            <Ionicons
              name={
                item.kind !== "discussion_reply"
                  ? "heart-outline"
                  : "chatbubbles-outline"
              }
              size={15}
              accessible={false}
            />
            {"  "}
            {item.kind !== "discussion_reply"
              ? isProtestant(profile)
                ? {
                    en: "Unburden",
                    pt: "Desabafos",
                    es: "Desahogos",
                    ru: "Поддержка",
                  }[profile.language]
                : {
                    en: "Confession",
                    pt: "Confissão",
                    es: "Confesión",
                    ru: "Исповедь",
                  }[profile.language]
              : {
                  en: "Discussion",
                  pt: "Discussão",
                  es: "Debate",
                  ru: "Обсуждение",
                }[profile.language]}
          </Body>
          <Body>
            {item.kind === "confession_thanks" ? thanks : item.kind === "confession_reply"
              ? isProtestant(profile)
                ? burdenReply
                : t.confession
              : t.discussion}
          </Body>
          {ids.length > 1 && <Body small>{
            { en: `${ids.length} new updates`, pt: `${ids.length} novas atualizações`, es: `${ids.length} novedades`, ru: `Новых обновлений: ${ids.length}` }[profile.language]
          }</Body>}
          <Body small>{t.unread}</Body>
          <Button
            secondary
            title={t.open}
            disabled={opening}
            onPress={() => void openActivity(item, ids)}
          />
        </Card>
      ))}
    </>
  );
}
