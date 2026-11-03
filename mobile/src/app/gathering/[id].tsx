import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Screen, Heading, Body, Button, Notice } from "../../components/ui";
import GatheringRoom, { RoomAccess } from "../../components/GatheringRoom";
import { requireUser } from "../../lib/backend";
import { useApp } from "../../lib/state";
import { copy } from "../../lib/content";
import { label } from "../../lib/labels";
export default function Gathering() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { profile } = useApp();
  const [access, setAccess] = useState<RoomAccess>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function join() {
    setBusy(true);
    setError("");
    try {
      const { client } = await requireUser();
      const { data, error } = await client.functions.invoke("gathering-token", {
        body: { gatheringId: id, action: "join" },
      });
      if (error) throw error;
      setAccess(data);
    } catch {
      setError(label(profile.language, "gatheringUnavailable"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen back>
      <Heading>{copy(profile.language, "gather")}</Heading>
      <Body>{copy(profile.language, "groupBoundary")}</Body>
      <Notice text={error} />
      {access ? (
        <GatheringRoom id={id} access={access} />
      ) : (
        <>
          <Body>{label(profile.language, "communityRules")}</Body>
          <Body small>{label(profile.language, "gatheringConsent")}</Body>
          <Button
            disabled={busy}
            title={label(profile.language, "join")}
            onPress={() => void join()}
          />
        </>
      )}
    </Screen>
  );
}
