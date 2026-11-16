import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Platform } from "react-native";
import { useApp } from "../lib/state";
import { backend } from "../lib/backend";
import { disableMemberPush, memberPushEnabled, registerMemberPush } from "../lib/notifications";
import { Body, Button, Card, Notice } from "./quiet-ui";
import { canUseRemotePush } from "../lib/push-availability";

const words = {
  en: { title: "Phone alerts", detail: "Get discreet alerts for replies, messages, friends, prayers and your gatherings.", moderator: "Moderator alerts are managed in the moderation dashboard.", on: "Turn on phone alerts", off: "Turn off phone alerts", error: "Could not update phone alerts. Check your iPhone notification settings and try again." },
  pt: { title: "Alertas no celular", detail: "Receba alertas discretos sobre respostas, mensagens, amizades, orações e seus encontros.", moderator: "Os alertas de moderação são gerenciados no painel de moderação.", on: "Ativar alertas no celular", off: "Desativar alertas no celular", error: "Não foi possível atualizar os alertas. Verifique as notificações do celular e tente novamente." },
  es: { title: "Alertas en el teléfono", detail: "Recibe alertas discretas sobre respuestas, mensajes, amistades, oraciones y tus encuentros.", moderator: "Las alertas de moderación se gestionan en el panel de moderación.", on: "Activar alertas", off: "Desactivar alertas", error: "No se pudieron actualizar las alertas. Revisa las notificaciones del teléfono e inténtalo de nuevo." },
  ru: { title: "Уведомления на телефоне", detail: "Мы будем деликатно уведомлять вас об ответах, сообщениях, друзьях, молитвах и ваших встречах.", moderator: "Уведомления модератора настраиваются в панели модерации.", on: "Включить уведомления", off: "Выключить уведомления", error: "Не удалось включить или выключить уведомления. Проверьте настройки уведомлений на телефоне и попробуйте ещё раз." },
};

export default function MemberPhoneAlerts() {
  const { profile } = useApp();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [staff, setStaff] = useState(false);
  const t = words[profile.language];
  const remoteAvailable = canUseRemotePush(Platform.OS, process.env.EXPO_PUBLIC_ANDROID_REMOTE_PUSH_ENABLED);
  useFocusEffect(useCallback(() => {
    if (Platform.OS === "web" || !remoteAvailable) return;
    let active = true;
    setBusy(true);
    if (backend) void Promise.resolve(backend.rpc("staff_role")).then(({ data, error }) => {
      if (active) setStaff(!error && (data === "moderator" || data === "admin"));
    }).catch(() => { if (active) setStaff(false); });
    void memberPushEnabled().then(value => { if (active) { setEnabled(value); setError(false); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [remoteAvailable]));
  if (Platform.OS === "web") return null;
  if (!remoteAvailable) return <Card><Body>{t.title}</Body><Body small>{{ en: "Phone alerts aren't available in this test build. In-app notifications remain available.", pt: "Alertas no celular não estão disponíveis nesta versão de teste. As notificações no aplicativo continuam disponíveis.", es: "Las alertas del teléfono no están disponibles en esta versión de prueba. Las notificaciones en la aplicación siguen disponibles.", ru: "В этой тестовой версии уведомления на телефоне недоступны. Уведомления внутри приложения продолжают работать." }[profile.language]}</Body></Card>;
  return <Card>
    <Body>{t.title}</Body>
    <Body small>{t.detail}</Body>
    {staff && <Body small>{t.moderator}</Body>}
    <Notice text={error ? t.error : ""} />
    <Button secondary disabled={busy} title={enabled ? t.off : t.on} onPress={() => {
      setBusy(true); setError(false);
      void (enabled ? disableMemberPush() : registerMemberPush(profile.language))
        .then(() => setEnabled(!enabled))
        .catch(() => setError(true))
        .finally(() => setBusy(false));
    }} />
  </Card>;
}
