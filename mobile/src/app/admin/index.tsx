import { useCallback, useEffect, useState } from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";
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
import { canUseRemotePush } from "../../lib/push-availability";
import ChatSafetyReports from "../../components/ChatSafetyReports";
import SafetyReviewGuide from "../../components/SafetyReviewGuide";
import GatheringSafetyReports from "../../components/GatheringSafetyReports";
import ModerationHistory from "../../components/ModerationHistory";
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
  const [priority, setPriority] = useState<Record<string, number> | null>(null);
  const [priorityFailed, setPriorityFailed] = useState(false);
  const priorityCopy = {
    en: { title: "Safety flags & reports", detail: "Review highlighted sections first. Reports and flags need human judgment; not every case is an emergency.", unavailable: "Couldn’t check safety flags. Open each review section and try again.", chat: "Chat reports", gatherings: "Gathering reports", guide: "Flags can be missed or wrong. Phone alerts may be delayed. This is not an emergency service." },
    pt: { title: "Alertas de segurança e denúncias", detail: "Revise primeiro as seções destacadas. Denúncias e alertas precisam de avaliação humana; nem todo caso é uma emergência.", unavailable: "Não foi possível verificar os alertas. Abra cada seção de revisão e tente novamente.", chat: "Denúncias de conversas", gatherings: "Denúncias de encontros", guide: "Alertas podem falhar ou estar errados. Notificações no celular podem atrasar. Este não é um serviço de emergência." },
    es: { title: "Avisos de seguridad y denuncias", detail: "Revisa primero las secciones destacadas. Los avisos requieren evaluación humana; no todos son emergencias.", unavailable: "No se pudieron comprobar los avisos. Abre cada sección de revisión e inténtalo de nuevo.", chat: "Denuncias de chats", gatherings: "Denuncias de encuentros", guide: "Los avisos pueden fallar o ser incorrectos. Las alertas al móvil pueden demorarse. Esto no es un servicio de emergencia." },
    ru: { title: "Тревожные сигналы и жалобы", detail: "Сначала проверьте выделенные разделы. Жалобы и сигналы должен оценить человек; не каждый случай — экстренный.", unavailable: "Не удалось проверить сигналы. Откройте каждый раздел проверки и попробуйте ещё раз.", chat: "Жалобы на чаты", gatherings: "Жалобы на встречи", guide: "Сигнал может не сработать или оказаться ошибочным. Уведомления на телефон могут приходить с задержкой. Это не экстренная служба." },
  }[profile.language];
  const pushCopy = {
    en: { on: "Turn on moderator phone alerts", off: "Turn off moderator phone alerts", saved: "Moderator phone alerts are on.", disabled: "Moderator phone alerts are off.", failed: "Could not update phone alerts. Check your notification settings and try again." },
    pt: { on: "Ativar alertas de moderação", off: "Desativar alertas de moderação", saved: "Alertas de moderação ativados.", disabled: "Alertas de moderação desativados.", failed: "Não foi possível atualizar os alertas. Verifique as notificações e tente novamente." },
    es: { on: "Activar alertas de moderación", off: "Desactivar alertas de moderación", saved: "Alertas de moderación activadas.", disabled: "Alertas de moderación desactivadas.", failed: "No se pudieron actualizar las alertas. Revisa las notificaciones e inténtalo de nuevo." },
    ru: { on: "Включить уведомления модератора", off: "Выключить уведомления модератора", saved: "Уведомления модератора включены.", disabled: "Уведомления модератора выключены.", failed: "Не удалось обновить уведомления. Проверьте настройки уведомлений и попробуйте ещё раз." },
  }[profile.language];
  const queueCopy = {
    en: { title: "Needs review", empty: "No items waiting for review.", count: "waiting", unavailable: "Review counts could not load. Open a section or try again.", retry: "Refresh", stories: "Story comments & reports" },
    pt: { title: "Precisam de revisão", empty: "Nenhum item aguardando revisão.", count: "aguardando", unavailable: "Não foi possível carregar as quantidades. Abra uma seção ou tente novamente.", retry: "Atualizar", stories: "Comentários e denúncias" },
    es: { title: "Pendiente de revisión", empty: "No hay elementos pendientes.", count: "pendientes", unavailable: "No se pudieron cargar los recuentos. Abre una sección o inténtalo de nuevo.", retry: "Actualizar", stories: "Comentarios y denuncias" },
    ru: { title: "Ожидают проверки", empty: "Нет материалов на проверке.", count: "на проверке", unavailable: "Не удалось загрузить количество. Откройте раздел или попробуйте ещё раз.", retry: "Обновить", stories: "Комментарии и жалобы" },
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
    let active = true;
    const refresh = () => {
      if (!allowed || queue || AppState.currentState !== "active") return;
      void loadCounts();
      // The server checks staff access and returns counts only, never text.
      void requireUser().then(async ({ client }) => {
        const { data, error } = await client.rpc("moderation_safety_counts");
        if (error || !data || typeof data !== "object" || Array.isArray(data)) throw new Error("invalid_queue");
        if (active) { setPriority(data as Record<string, number>); setPriorityFailed(false); }
      }).catch(() => { if (active) { setPriority(null); setPriorityFailed(true); } });
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(timer); };
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
      setPriority(null);
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
        {queue === "history" ? (
          <ModerationHistory />
        ) : queue === "editorial" ? (
          <EditorialStories />
        ) : queue === "gatherings" ? (
          <Screen><GatheringSafetyReports /></Screen>
        ) : queue === "chats" ? (
          <Screen><ChatSafetyReports /></Screen>
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
          {(priorityFailed || (priority !== null && Object.values(priority).some(count => count > 0))) && <View style={{ gap: 8, padding: 14, borderWidth: 1, borderColor: surface.line, borderRadius: 14 }}>
            {!priorityFailed && <Text accessibilityRole="header" style={{ color: surface.ink, fontSize: 16, fontWeight: "700" }}>{priorityCopy.title}</Text>}
            <Text style={{ color: surface.muted, fontSize: 14, lineHeight: 20 }}>{priorityFailed ? priorityCopy.unavailable : priorityCopy.detail}</Text>
          </View>}
          <Body small>{priorityCopy.guide}</Body>
          <SafetyReviewGuide />
          {Platform.OS !== "web" && canUseRemotePush(Platform.OS, process.env.EXPO_PUBLIC_ANDROID_REMOTE_PUSH_ENABLED) && <Button secondary disabled={pushBusy} title={pushEnabled ? pushCopy.off : pushCopy.on} onPress={() => {
            setPushBusy(true); setNotice("");
            void (pushEnabled ? disableModeratorPush() : registerModeratorPush()).then(() => {
              setPushEnabled(!pushEnabled); setNotice(pushEnabled ? pushCopy.disabled : pushCopy.saved);
            }).catch(() => setNotice(pushCopy.failed)).finally(() => setPushBusy(false));
          }} />}
          <Text accessibilityRole="header" style={{ color: surface.ink, fontSize: 16, fontWeight: "600", marginTop: 12 }}>{queueCopy.title}</Text>
          {countsFailed && <><Body small>{queueCopy.unavailable}</Body><TextAction title={queueCopy.retry} onPress={() => void loadCounts()} /></>}
          {counts && priority && Object.values(counts).every((count) => count === 0) && Object.values(priority).every(count => count === 0) && <Body small>{queueCopy.empty}</Body>}
          {[
            ["discussions", "Discussions"],
            ["confessions", "Confessions"],
            ["testimonies", "Testimonies"],
            ["prayers", "Prayer requests"],
            ["giving", "Pay it forward"],
            ["stories", queueCopy.stories],
            ["chats", priorityCopy.chat],
            ["gatherings", priorityCopy.gatherings],
          ].sort((a, b) => (priority?.[b[0]] ?? 0) - (priority?.[a[0]] ?? 0) || (counts?.[b[0]] ?? 0) - (counts?.[a[0]] ?? 0)).map(([id, label]) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`${id === "stories" || id === "chats" || id === "gatherings" ? label : tr(label)}${priority?.[id] ? `, ${priority[id]} ${queueCopy.count}` : counts?.[id] ? `, ${counts[id]} ${queueCopy.count}` : ""}`}
              onPress={() => {
                if (id === "confessions") router.setParams({ view: "review" });
                setQueue(id);
              }}
              style={({ pressed }) => ({ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: surface.line, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={{ color: surface.ink, fontSize: 16, flex: 1 }}>{id === "stories" || id === "chats" || id === "gatherings" ? label : tr(label)}</Text>
              {(priority?.[id] || counts?.[id] || 0) > 0 && <View style={{ backgroundColor: priority?.[id] ? "#D8AC61" : "#B88B3E", borderRadius: 12, minWidth: 26, paddingHorizontal: 8, paddingVertical: 3, alignItems: "center" }}><Text style={{ color: "#1B1612", fontSize: 13, fontWeight: "700" }}>{priority?.[id] || counts?.[id]}</Text></View>}
              <Ionicons name="chevron-forward" size={18} color={surface.muted} />
            </Pressable>
          ))}
          <TextAction title={communityCopy(profile.language, "editorialStories")} icon="create-outline" onPress={() => setQueue("editorial")} />
          <TextAction title={{en:"Not approved",pt:"Não aprovados",es:"No aprobados",ru:"Не одобрено"}[profile.language]} icon="time-outline" onPress={() => setQueue("history")} />
        </>
      )}
    </Screen>
  );
}
