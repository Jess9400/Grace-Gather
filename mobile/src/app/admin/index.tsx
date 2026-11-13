import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import { Screen, Heading, Body, Notice, Button } from "../../components/quiet-ui";
import { TextAction } from "../../components/CommunityControls";
import { requireUser, backend } from "../../lib/backend";
import { useInterfaceCopy } from "../../lib/use-interface-copy";
import Giving from "../giving";
import Community from "../../components/CommunityBoard";
import PrayerPage from "../../components/PrayerPage";
import TestimonyReview from "../testimonies/review";
import Confession from "../(tabs)/confession";
import EditorialStories from "../../components/EditorialStories";
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
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const pushCopy = {
    en: { on: "Turn on moderator phone alerts", off: "Turn off moderator phone alerts", saved: "Moderator phone alerts are on.", disabled: "Moderator phone alerts are off.", failed: "Could not update phone alerts. Check your notification settings and try again." },
    pt: { on: "Ativar alertas de moderação", off: "Desativar alertas de moderação", saved: "Alertas de moderação ativados.", disabled: "Alertas de moderação desativados.", failed: "Não foi possível atualizar os alertas. Verifique as notificações e tente novamente." },
    es: { on: "Activar alertas de moderación", off: "Desactivar alertas de moderación", saved: "Alertas de moderación activadas.", disabled: "Alertas de moderación desactivadas.", failed: "No se pudieron actualizar las alertas. Revisa las notificaciones e inténtalo de nuevo." },
    ru: { on: "Включить уведомления модератора", off: "Выключить уведомления модератора", saved: "Уведомления модератора включены.", disabled: "Уведомления модератора выключены.", failed: "Не удалось обновить уведомления. Проверьте настройки и повторите попытку." },
  }[profile.language];
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
          <TextAction
            title={communityCopy(profile.language, "editorialStories")}
            icon="chevron-forward"
            onPress={() => setQueue("editorial")}
          />
          {[
            ["discussions", "Discussions"],
            ["confessions", "Confessions"],
            ["testimonies", "Testimonies"],
            ["prayers", "Prayer requests"],
            ["giving", "Pay it forward"],
          ].map(([id, label]) => (
            <TextAction
              key={id}
              title={tr(label)}
              icon="chevron-forward"
              onPress={() => {
                if (id === "confessions") router.setParams({ view: "review" });
                setQueue(id);
              }}
            />
          ))}
        </>
      )}
    </Screen>
  );
}
