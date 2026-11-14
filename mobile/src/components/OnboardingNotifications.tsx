import { useState } from "react";
import { Platform } from "react-native";
import { backend } from "../lib/backend";
import type { Language } from "../lib/content";
import { registerGatheringPush, registerMemberPush, registerModeratorPush } from "../lib/notifications";
import { Body, Button, Card, Notice, Subheading } from "./quiet-ui";

const words = {
  en:{title:"Phone notifications",info:"Get updates about replies, messages and gatherings. You can change this later.",allow:"Allow notifications",enabled:"Notifications enabled",failed:"Notifications couldn’t be enabled. You can try again in Preferences."},
  pt:{title:"Notificações no celular",info:"Receba avisos sobre respostas, mensagens e encontros. Você pode mudar isso depois.",allow:"Permitir notificações",enabled:"Notificações ativadas",failed:"Não foi possível ativar as notificações. Tente novamente em Preferências."},
  es:{title:"Notificaciones en el móvil",info:"Recibe avisos sobre respuestas, mensajes y encuentros. Puedes cambiarlo después.",allow:"Permitir notificaciones",enabled:"Notificaciones activadas",failed:"No se pudieron activar las notificaciones. Inténtalo de nuevo en Preferencias."},
  ru:{title:"Уведомления на телефоне",info:"Получайте уведомления об ответах, сообщениях и встречах. Это можно изменить позже.",allow:"Разрешить уведомления",enabled:"Уведомления включены",failed:"Не удалось включить уведомления. Повторите попытку в настройках."},
};
export default function OnboardingNotifications({language}:{language:Language}) {
  const t=words[language], [busy,setBusy]=useState(false), [enabled,setEnabled]=useState(false), [error,setError]=useState("");
  if (Platform.OS === "web") return null;
  async function allow() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await registerMemberPush(language);
      await registerGatheringPush();
      const role=await backend?.rpc("staff_role");
      if (role?.error) throw role.error;
      if (role?.data === "admin" || role?.data === "moderator") await registerModeratorPush();
      setEnabled(true);
    } catch { setError(t.failed); }
    finally { setBusy(false); }
  }
  return <Card><Subheading>{t.title}</Subheading><Body small>{t.info}</Body><Notice text={error}/>
    <Button secondary title={enabled?t.enabled:t.allow} disabled={busy || enabled} onPress={() => void allow()}/>
  </Card>;
}
