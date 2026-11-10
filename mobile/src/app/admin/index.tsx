import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Screen, Heading, Body, Notice } from "../../components/quiet-ui";
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
export default function AdminDashboard() {
  const tr = useInterfaceCopy();
  const { profile } = useApp();
  const [allowed, setAllowed] = useState(false);
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(true);
  const [queue, setQueue] = useState("");
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
