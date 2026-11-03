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
    try {
      const { client } = await requireUser();
      const { data, error } = await client.functions.invoke("gathering-token", {
        body: { gatheringId: id, action: "join" },
      });
      if (error) throw error;
      setAccess(data);
    } catch {
      setError(
        "The room is unavailable. Join within 10 minutes of the scheduled start. A reservation and a configured host are required.",
      );
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
          <Body small>
            By joining, you agree to the community rules. Your microphone starts
            off. Other participants can hear what you choose to share; avoid
            sharing private information.
          </Body>
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
