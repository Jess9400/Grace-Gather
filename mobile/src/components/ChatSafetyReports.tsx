import { useCallback, useEffect, useState } from "react";
import { Body, Button, Card, Heading, Notice } from "./quiet-ui";
import { requireUser } from "../lib/backend";
import { useApp } from "../lib/state";

type Report = { id: string; reason: string; body: string; created_at: string };
const words = {
  en: { title: "Chat reports", intro: "Only the reported message and its reason appear here; surrounding messages are not shown.", private: "Private chat", group: "Group chat", reason: "Report reason", reviewed: "Mark reviewed", remove: "Remove group message", empty: "No chat reports waiting.", error: "Chat reports could not be loaded. Try again.", retry: "Try again" },
  pt: { title: "Denúncias de conversas", intro: "Apenas a mensagem denunciada e o motivo aparecem aqui; as demais mensagens não são exibidas.", private: "Conversa privada", group: "Conversa em grupo", reason: "Motivo da denúncia", reviewed: "Marcar como revisada", remove: "Remover mensagem do grupo", empty: "Nenhuma denúncia de conversa aguardando.", error: "Não foi possível carregar as denúncias. Tente novamente.", retry: "Tentar novamente" },
  es: { title: "Denuncias de chats", intro: "Aquí solo aparecen el mensaje denunciado y el motivo; no se muestran los mensajes de alrededor.", private: "Chat privado", group: "Chat de grupo", reason: "Motivo de la denuncia", reviewed: "Marcar revisado", remove: "Eliminar mensaje del grupo", empty: "No hay denuncias pendientes.", error: "No se pudieron cargar las denuncias. Inténtalo de nuevo.", retry: "Reintentar" },
  ru: { title: "Жалобы на чаты", intro: "Здесь показаны только сообщение, на которое пожаловались, и причина; соседние сообщения не видны.", private: "Личный чат", group: "Групповой чат", reason: "Причина жалобы", reviewed: "Отметить как проверенную", remove: "Удалить сообщение из группы", empty: "Жалоб пока нет.", error: "Не удалось загрузить жалобы. Попробуйте ещё раз.", retry: "Повторить" },
};
export default function ChatSafetyReports() {
  const { profile } = useApp();
  const t = words[profile.language];
  const [reports, setReports] = useState<{ private: Report[]; group: Report[] } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const { client } = await requireUser();
      const [direct, group] = await Promise.all([
        client.rpc("friends_command", { p_action: "reports", p_data: {} }),
        client.rpc("group_chat_command", { p_action: "reports", p_data: {} }),
      ]);
      if (direct.error || group.error || !Array.isArray(direct.data) || !Array.isArray(group.data)) throw new Error("unavailable");
      setReports({ private: direct.data, group: group.data }); setError("");
    } catch { setReports(null); setError(t.error); }
  }, [t.error]);
  useEffect(() => { let active = true; void Promise.resolve().then(() => { if (active) void load(); }); return () => { active = false; }; }, [load]);
  async function resolve(kind: "private" | "group", id: string, remove = false) {
    setBusy(true); setError("");
    try {
      const { client } = await requireUser();
      const { error } = await client.rpc(kind === "private" ? "friends_command" : "group_chat_command", {
        p_action: "resolve_report", p_data: kind === "group" ? { id, remove } : { id },
      });
      if (error) throw error;
      await load();
    } catch { setError(t.error); } finally { setBusy(false); }
  }
  return <>
    <Heading>{t.title}</Heading><Body small>{t.intro}</Body><Notice text={error} />
    {error ? <Button secondary title={t.retry} disabled={busy} onPress={() => void load()} /> : null}
    {reports && !reports.private.length && !reports.group.length && <Body>{t.empty}</Body>}
    {reports && (["private", "group"] as const).flatMap(kind => reports[kind].map(report => <Card key={`${kind}-${report.id}`}>
      <Body small>{t[kind]}</Body><Body>{report.body}</Body><Body small>{t.reason}: {report.reason}</Body>
      <Button secondary title={t.reviewed} disabled={busy} onPress={() => void resolve(kind, report.id)} />
      {kind === "group" && <Button secondary title={t.remove} disabled={busy} onPress={() => void resolve(kind, report.id, true)} />}
    </Card>))}
  </>;
}
