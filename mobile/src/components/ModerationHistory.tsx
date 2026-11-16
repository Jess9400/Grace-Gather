import { useCallback, useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useApp } from "../lib/state";
import { requireUser } from "../lib/backend";
import { Screen, Heading, Body, Button, Card, Notice } from "./quiet-ui";
import { Disclosure } from "./CommunityControls";
import ConfessionAudio from "./ConfessionAudio";

type Item = { id: string; category: string; body: string; title: string; submitted_at: string; has_audio: boolean; reason: string };
const copy = {
  en: { heading: "Not approved", intro: "Submissions currently not approved. Dates show when they were submitted. Deleted submissions are not retained here.", empty: "No items on this page.", error: "Could not load review history. Try again.", retry: "Try again", next: "Next", previous: "Previous", reason: "Review note", categories: { confession: "Confession", comfort: "Comfort", discussion: "Discussion", testimony: "Testimony", prayer: "Prayer request", comment: "Comment", giving: "Pay it forward" } },
  pt: { heading: "Não aprovados", intro: "Publicações que não foram aprovadas. As datas mostram quando foram enviadas. Itens excluídos não ficam guardados aqui.", empty: "Nenhum item nesta página.", error: "Não foi possível carregar o histórico. Tente novamente.", retry: "Tentar novamente", next: "Próxima", previous: "Anterior", reason: "Observação da revisão", categories: { confession: "Desabafo", comfort: "Resposta de conforto", discussion: "Discussão", testimony: "Testemunho", prayer: "Pedido de oração", comment: "Comentário", giving: "Fazer o bem" } },
  es: { heading: "No aprobados", intro: "Publicaciones que no se aprobaron. Las fechas indican cuándo se enviaron. Los elementos eliminados no se conservan aquí.", empty: "No hay elementos en esta página.", error: "No se pudo cargar el historial. Inténtalo de nuevo.", retry: "Intentar de nuevo", next: "Siguiente", previous: "Anterior", reason: "Nota de revisión", categories: { confession: "Desahogo", comfort: "Respuesta de consuelo", discussion: "Debate", testimony: "Testimonio", prayer: "Petición de oración", comment: "Comentario", giving: "Ayudar a otros" } },
  ru: { heading: "Не одобрено", intro: "Публикации, которые сейчас не одобрены. Указана дата отправки. Удалённые записи здесь не сохраняются.", empty: "На этой странице ничего нет.", error: "Не удалось загрузить историю. Попробуйте снова.", retry: "Повторить", next: "Далее", previous: "Назад", reason: "Заметка проверки", categories: { confession: "Исповедь", comfort: "Слова поддержки", discussion: "Обсуждение", testimony: "Свидетельство", prayer: "Просьба о молитве", comment: "Комментарий", giving: "Помощь другим" } },
};
export default function ModerationHistory() {
  const { profile } = useApp();
  const t = copy[profile.language];
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const load = useCallback(async () => {
    const { client } = await requireUser();
    const { data, error: failure } = await client.rpc("rejected_moderation_items", { p_offset: page * 50 });
    if (failure || !Array.isArray(data)) throw Error("history_unavailable");
    return data as Item[];
  }, [page]);
  useEffect(() => {
    let active = true;
    void load().then(data => { if (active) { setItems(data); setError(""); } })
      .catch(() => { if (active) { setItems([]); setError(t.error); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, retry, t.error]);
  return <Screen>
    <Heading>{t.heading}</Heading>
    <Body small>{t.intro}</Body>
    {loading && <ActivityIndicator accessibilityLabel={t.heading} />}
    <Notice text={error} />
    {error ? <Button secondary title={t.retry} onPress={() => { setLoading(true); setError(""); setRetry(value => value + 1); }} /> : null}
    {!loading && !error && items.length === 0 && <Body small>{t.empty}</Body>}
    {!loading && items.map(item => <Card key={`${item.category}-${item.id}`}>
      <Disclosure title={`${t.categories[item.category as keyof typeof t.categories] ?? item.category}${item.title ? ` · ${item.title}` : ""}`}>
        <Body small>{new Date(item.submitted_at).toLocaleDateString(profile.language)}</Body>
        {!!item.body && <Body>{item.body}</Body>}
        {!!item.reason && <><Body small>{t.reason}</Body><Body small>{item.reason}</Body></>}
        {item.has_audio && <ConfessionAudio id={item.id} language={profile.language} />}
      </Disclosure>
    </Card>)}
    <View style={{ flexDirection: "row", gap: 12 }}>
      {!loading && page > 0 && <Button secondary title={t.previous} onPress={() => { setLoading(true); setPage(value => value - 1); }} />}
      {!loading && items.length === 50 && <Button secondary title={t.next} onPress={() => { setLoading(true); setPage(value => value + 1); }} />}
    </View>
  </Screen>;
}
