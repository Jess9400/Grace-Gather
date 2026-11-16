import { useState } from "react";
import { Body, Button, Field, Notice } from "./quiet-ui";
import { Disclosure } from "./CommunityControls";
import { requireUser } from "../lib/backend";
import { useApp } from "../lib/state";

const words = {
  en: { title: "Report a concern", note: "Your report goes to moderators. Live audio is not recorded for review. This is not an emergency service.", reason: "What happened?", send: "Send report", sent: "Your report was sent for review.", failed: "Couldn’t send your report. Please try again.", tooShort: "Please add a few details." },
  pt: { title: "Denunciar uma preocupação", note: "Sua denúncia será enviada à moderação. O áudio ao vivo não é gravado para revisão. Este não é um serviço de emergência.", reason: "O que aconteceu?", send: "Enviar denúncia", sent: "Sua denúncia foi enviada para revisão.", failed: "Não foi possível enviar sua denúncia. Tente novamente.", tooShort: "Adicione alguns detalhes." },
  es: { title: "Informar de una preocupación", note: "Tu denuncia se envía a moderación. El audio en vivo no se graba para revisión. Esto no es un servicio de emergencia.", reason: "¿Qué pasó?", send: "Enviar denuncia", sent: "Tu denuncia se envió para revisión.", failed: "No se pudo enviar tu denuncia. Inténtalo de nuevo.", tooShort: "Añade algunos detalles." },
  ru: { title: "Сообщить о проблеме", note: "Жалобу получат модераторы. Звук встречи не записывается, в том числе для проверки. Это не экстренная служба.", reason: "Что произошло?", send: "Отправить жалобу", sent: "Жалоба отправлена на проверку.", failed: "Не удалось отправить жалобу. Попробуйте ещё раз.", tooShort: "Опишите чуть подробнее." },
};
export default function GatheringSafetyReport({ id, invite }: { id: string; invite?: string }) {
  const { profile } = useApp(); const t = words[profile.language];
  const [reason, setReason] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  async function submit() {
    if (reason.trim().length < 3) { setNotice(t.tooShort); return; }
    setBusy(true); setNotice("");
    try {
      const { client } = await requireUser();
      const { error } = await client.rpc("submit_gathering_safety_report", { p_gathering: id, p_invite: invite ?? "", p_reason: reason.trim() });
      if (error) throw error;
      setReason(""); setNotice(t.sent);
    } catch { setNotice(t.failed); } finally { setBusy(false); }
  }
  return <Disclosure title={t.title}><Body small>{t.note}</Body><Notice text={notice} /><Field label={t.reason} value={reason} onChangeText={setReason} maxLength={500} multiline /><Button secondary title={t.send} disabled={busy} loading={busy} onPress={() => void submit()} /></Disclosure>;
}
