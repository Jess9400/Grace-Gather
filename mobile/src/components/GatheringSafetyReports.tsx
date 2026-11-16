import { useCallback, useEffect, useState } from "react";
import { Body, Button, Card, Heading, Notice } from "./quiet-ui";
import { requireUser } from "../lib/backend";
import { useApp } from "../lib/state";
import { storyText } from "../lib/discover";
import type { Localized } from "../lib/content";

type Report = { id: string; title: Localized; reason: string; created_at: string };
const words = {
  en: { title: "Gathering reports", intro: "Review the member’s report. Live audio is not recorded for review.", done: "Mark reviewed", empty: "No gathering reports waiting.", error: "Couldn’t load or update reports. Try again.", retry: "Try again" },
  pt: { title: "Denúncias de encontros", intro: "Revise a denúncia enviada. O áudio ao vivo não é gravado para revisão.", done: "Marcar como revisada", empty: "Nenhuma denúncia de encontro aguardando.", error: "Não foi possível carregar ou atualizar as denúncias. Tente novamente.", retry: "Tentar novamente" },
  es: { title: "Denuncias de encuentros", intro: "Revisa la denuncia. El audio en vivo no se graba para revisión.", done: "Marcar revisado", empty: "No hay denuncias pendientes.", error: "No se pudieron cargar o actualizar las denuncias. Inténtalo de nuevo.", retry: "Reintentar" },
  ru: { title: "Жалобы на встречи", intro: "Проверьте жалобу участника. Звук встречи не записывается, в том числе для проверки.", done: "Отметить как проверенную", empty: "Жалоб на встречи пока нет.", error: "Не удалось загрузить или обновить жалобы. Попробуйте ещё раз.", retry: "Повторить" },
};
export default function GatheringSafetyReports() {
  const { profile } = useApp(); const t = words[profile.language];
  const [reports, setReports] = useState<Report[] | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const { client } = await requireUser(); const result = await client.rpc("gathering_safety_report_queue");
      if (result.error || !Array.isArray(result.data)) throw new Error("unavailable");
      setReports(result.data); setError("");
    } catch { setReports(null); setError(t.error); }
  }, [t.error]);
  useEffect(() => { let active = true; void Promise.resolve().then(() => { if (active) void load(); }); return () => { active = false; }; }, [load]);
  async function resolve(id: string) {
    setBusy(true); setError("");
    try { const { client } = await requireUser(); const result = await client.rpc("resolve_gathering_safety_report", { p_id: id }); if (result.error || result.data !== true) throw new Error("unavailable"); await load(); }
    catch { setError(t.error); } finally { setBusy(false); }
  }
  return <><Heading>{t.title}</Heading><Body small>{t.intro}</Body><Notice text={error} />
    {error ? <Button secondary title={t.retry} disabled={busy} onPress={() => void load()} /> : null}
    {reports && !reports.length && <Body>{t.empty}</Body>}
    {reports?.map(report => <Card key={report.id}><Body>{storyText(report.title, profile.language)}</Body><Body>{report.reason}</Body><Button secondary title={t.done} disabled={busy} onPress={() => void resolve(report.id)} /></Card>)}
  </>;
}
