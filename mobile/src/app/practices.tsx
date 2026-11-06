import { useState } from "react";
import { Screen, Heading, Body, Button, Notice } from "../components/quiet-ui";
import { useApp } from "../lib/state";
import { welcomesCandles } from "../lib/church-calendar";
import { useInterfaceCopy } from "../lib/use-interface-copy";
export default function Practices() {
  const { profile, saveProfile } = useApp();
  const tr = useInterfaceCopy();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function change(
    key: "candlePractice" | "churchPresence",
    value: boolean,
  ) {
    setBusy(true);
    setError("");
    try {
      await saveProfile({ ...profile, [key]: value });
    } catch {
      setError(tr("Could not save. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen back>
      <Heading>{tr("Church preferences")}</Heading>
      <Body>
        {tr(
          "Your tradition sets a starting point. Choose the practices that feel meaningful to you.",
        )}
      </Body>
      <Button
        secondary
        disabled={busy}
        title={tr(
          welcomesCandles(profile)
            ? "Candle recommendations: on"
            : "Candle recommendations: off",
        )}
        onPress={() => void change("candlePractice", !welcomesCandles(profile))}
      />
      <Body>
        {tr(
          "Include this device in the church presence count only while Home is open. No name or journal is shared. This counts devices, not verified people.",
        )}
      </Body>
      <Button
        secondary
        disabled={busy}
        title={tr(
          profile.churchPresence
            ? "Church presence: on"
            : "Church presence: off",
        )}
        onPress={() => void change("churchPresence", !profile.churchPresence)}
      />
      <Notice text={error} />
    </Screen>
  );
}
