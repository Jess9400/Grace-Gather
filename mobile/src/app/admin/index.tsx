import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Heading, Body, Notice, Button } from "../../components/quiet-ui";
import { useSurfaceColors } from "../../components/community-ui";
import { TextAction } from "../../components/CommunityControls";
import { requireUser, backend } from "../../lib/backend";
import { useInterfaceCopy } from "../../lib/use-interface-copy";
import Giving from "../giving";
import Community from "../../components/CommunityBoard";
import PrayerPage from "../../components/PrayerPage";
import TestimonyReview from "../testimonies/review";
import Confession from "../(tabs)/confession";
import EditorialStories from "../../components/EditorialStories";
import Staff from "../staff";
import { useApp } from "../../lib/state";
import { communityCopy } from "../../lib/community-copy";
import { disableModeratorPush, moderatorPushEnabled, registerModeratorPush } from "../../lib/notifications";
export default function AdminDashboard() {
  const tr = useInterfaceCopy();
  const { profile } = useApp();
  const [allowed, setAllowed] = useState(false);
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(true);
  const [queue, setQueue] = useState("");
  const surface = useSurfaceColors();
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [countsFailed, setCountsFailed] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const pushCopy = {
    en: { on: "Turn on moderator phone alerts", off: "Turn off moderator phone alerts", saved: "Moderator phone alerts are on.", disabled: "Moderator phone alerts are off.", failed: "Could not update phone alerts. Check your notification settings and try again." },
    pt: { on: "Ativar alertas de moderação", off: "Desativar alertas de moderação", saved: "Alertas de moderação ativados.", disabled: "Alertas de moderação desativados.", failed: "Não foi possível atualizar os alertas. Verifique as notificações e tente novamente." },
    es: { on: "Activar alertas de moderación", off: "Desactivar alertas de moderación", saved: "Alertas de moderación activadas.", disabled: "Alertas de moderación desactivadas.", failed: "No se pudieron actualizar las alertas. Revisa las notificaciones e inténtalo de nuevo." },
    ru: { on: "Включить уведомления модератора", off: "Выключить уведомления модератора", saved: "Уведомления модератора включены.", disabled: "Уведомления модератора выключены.", failed: "Не удалось обновить уведомления. Проверьте настройки и повторите попытку." },
  }[profile.language];
  const queueCopy = {
    en: { title: "Needs review", empty: "No items waiting for review.", count: "waiting", unavailable: "Review counts could not load. Open a section or try again.", retry: "Refresh", stories: "Story comments & reports" },
    pt: { title: "Precisam de revisão", empty: "Nenhum item aguardando revisão.", count: "aguardando", unavailable: "Não foi possível carregar as quantidades. Abra uma seção ou tente novamente.", retry: "Atualizar", stories: "Comentários e denúncias" },
    es: { title: "Pendiente de revisión", empty: "No hay elementos pendientes.", count: "pendientes", unavailable: "No se pudieron cargar los recuentos. Abre una sección o inténtalo de nuevo.", retry: "Actualizar", stories: "Comentarios y denuncias" },
    ru: { title: "Ожидают проверки", empty: "Нет материалов на проверке.", count: "ожидают", unavailable: "Не удалось загрузить количество. Откройте раздел или повторите попытку.", retry: "Обновить", stories: "Комментарии и жалобы" },
  }[profile.language];
  const loadCounts = useCallback(async () => {
    try {
      const { client } = await requireUser();
      const { data, error } = await client.rpc("moderation_queue_counts");
      if (error || !data || typeof data !== "object") throw new Error("unavailable");
      setCounts(data as Record<string, number>);
      setCountsFailed(false);
    } catch {
      setCounts(null);
      setCountsFailed(true);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    if (allowed && !queue) void loadCounts();
  }, [allowed, queue, loadCounts]));
  useEffect(() => { if (allowed && Platform.OS !== "web") void moderatorPushEnabled().then(setPushEnabled).catch(() => setPushEnabled(false)); }, [allowed]);
  useEffect(() => {
    let active = true;
    void requireUser()
      .then(async ({ client }) => {
        const { data, error } = await client.rpc("staff_role");
        if (error || !["moderator", "admin"].includes(data)) throw new Error();
        if (active) setAllowed(true);
      })
      .catch(() => {
        if (active) setNotice("A moderator account is required.");
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    const subscription = backend?.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT" && event !== "SIGNED_IN") return;
      setAllowed(false);
      setCounts(null);
      setQueue("");
      setNotice("Reopen the dashboard to verify your staff access.");
    });
    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);
  if (allowed && queue)
    return (
      <>
        <TextAction
          icon="chevron-back"
          title={tr("Admin dashboard")}
          onPress={() => {
            setQueue("");
            router.setParams({ view: "" });
          }}
        />
        {queue === "editorial" ? (
          <EditorialStories />
        ) : queue === "stories" ? (
          <Staff />
        ) : queue === "giving" ? (
          <Giving review />
        ) : queue === "discussions" ? (
          <Community review />
        ) : queue === "prayers" ? (
          <PrayerPage mode="review" />
        ) : queue === "testimonies" ? (
          <TestimonyReview />
        ) : (
          <Confession />
        )}
      </>
    );
  return (
    <Screen back>
      <Heading>{tr("Admin dashboard")}</Heading>
      <Notice text={notice ? tr(notice) : ""} />
      {checking && <Body>{tr("Checking access…")}</Body>}
      {allowed && (
        <>
          <Body small>
            {tr("Review submissions and reports across the community.")}
          </Body>
          {Platform.OS !== "web" && <Button secondary disabled={pushBusy} title={pushEnabled ? pushCopy.off : pushCopy.on} onPress={() => {
            setPushBusy(true); setNotice("");
            void (pushEnabled ? disableModeratorPush() : registerModeratorPush()).then(() => {
              setPushEnabled(!pushEnabled); setNotice(pushEnabled ? pushCopy.disabled : pushCopy.saved);
            }).catch(() => setNotice(pushCopy.failed)).finally(() => setPushBusy(false));
          }} />}
          <Text accessibilityRole="header" style={{ color: surface.ink, fontSize: 16, fontWeight: "600", marginTop: 12 }}>{queueCopy.title}</Text>
          {countsFailed && <><Body small>{queueCopy.unavailable}</Body><TextAction title={queueCopy.retry} onPress={() => void loadCounts()} /></>}
          {counts && Object.values(counts).every((count) => count === 0) && <Body small>{queueCopy.empty}</Body>}
          {[
            ["discussions", "Discussions"],
            ["confessions", "Confessions"],
            ["testimonies", "Testimonies"],
            ["prayers", "Prayer requests"],
            ["giving", "Pay it forward"],
            ["stories", queueCopy.stories],
          ].sort((a, b) => (counts?.[b[0]] ?? 0) - (counts?.[a[0]] ?? 0)).map(([id, label]) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`${id === "stories" ? label : tr(label)}${counts ? `, ${counts[id]} ${queueCopy.count}` : ""}`}
              onPress={() => {
                if (id === "confessions") router.setParams({ view: "review" });
                setQueue(id);
              }}
              style={({ pressed }) => ({ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: surface.line, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ color: surface.ink, fontSize: 16, flex: 1 }}>{id === "stories" ? label : tr(label)}</Text>
              {counts && counts[id] > 0 && <View style={{ backgroundColor: "#B88B3E", borderRadius: 12, minWidth: 26, paddingHorizontal: 8, paddingVertical: 3, alignItems: "center" }}><Text style={{ color: "#1B1612", fontSize: 13, fontWeight: "700" }}>{counts[id]}</Text></View>}
              <Ionicons name="chevron-forward" size={18} color={surface.muted} />
            </Pressable>
          ))}
          <TextAction title={communityCopy(profile.language, "editorialStories")} icon="create-outline" onPress={() => setQueue("editorial")} />
        </>
      )}
    </Screen>
  );
}
