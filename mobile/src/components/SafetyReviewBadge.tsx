import { useEffect, useState } from "react";
import { Body } from "./quiet-ui";
import { requireUser } from "../lib/backend";
import { useApp } from "../lib/state";
import { useCommunity } from "../lib/discussion-state";

type Kind = "confessions" | "discussions" | "prayers" | "testimonies" | "giving" | "stories";
export function useSafetyReviewIds(kind: Kind, enabled: boolean): { ids: string[]; failed: boolean } {
  const { userId } = useCommunity();
  const [result, setResult] = useState<{ kind: Kind; userId: string; ids: string[]; failed: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    if (enabled && userId) void requireUser().then(async ({ client, user }) => {
      if (user.id !== userId) throw new Error("account_changed");
      const { data, error } = await client.rpc("moderation_safety_ids", { p_kind: kind });
      if (error || !Array.isArray(data)) throw new Error("unavailable");
      if (active) setResult({ kind, userId, ids: data.filter((id): id is string => typeof id === "string"), failed: false });
    }).catch(() => { if (active) setResult({ kind, userId, ids: [], failed: true }); });
    return () => { active = false; };
  }, [kind, enabled, userId]);
  return enabled && result?.kind === kind && result.userId === userId ? result : { ids: [], failed: false };
}
export function SafetyReviewUnavailable() {
  const { profile } = useApp();
  const text = {
    en: "Safety markers could not load. Review the whole queue.",
    pt: "Não foi possível carregar os alertas. Revise toda a fila.",
    es: "No se pudieron cargar los avisos. Revisa toda la lista.",
    ru: "Не удалось загрузить тревожные сигналы. Проверьте всю очередь.",
  }[profile.language];
  return <Body small>{text}</Body>;
}
export default function SafetyReviewBadge() {
  const { profile } = useApp();
  const text = {
    en: "Safety flag or report · review first",
    pt: "Alerta ou denúncia de segurança · revise primeiro",
    es: "Aviso o denuncia de seguridad · revisa primero",
    ru: "Сигнал или жалоба · проверьте в первую очередь",
  }[profile.language];
  return <Body small>{text}</Body>;
}
