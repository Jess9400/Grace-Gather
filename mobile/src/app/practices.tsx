import { router } from "expo-router";
import { loadSoundOn, saveSoundOn } from "../lib/church-audio";
import { requestChurchTour } from "../lib/church-entrance";
import { useEffect, useState } from "react";
import { Screen, Heading, Body, Button, Notice } from "../components/quiet-ui";
import { useApp } from "../lib/state";
import { welcomesCandles } from "../lib/church-calendar";
import { useInterfaceCopy } from "../lib/use-interface-copy";
export default function Practices() {
  const { profile, saveProfile } = useApp();
  const tr = useInterfaceCopy();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [sound, setSound] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void loadSoundOn().then((on) => {
      if (active) setSound(on);
    });
    return () => {
      active = false;
    };
  }, []);
  async function lighting(value: "auto" | "day" | "night") {
    setBusy(true);
    setError("");
    try {
      await saveProfile({ ...profile, churchLighting: value });
    } catch {
      setError(tr("Could not save. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  async function change(key: "candlePractice", value: boolean) {
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
      <Body>{tr("Church sounds play only on Home after the entrance.")}</Body>
      <Button
        secondary
        disabled={busy || sound === null}
        title={tr(sound ? "Church sounds: on" : "Church sounds: off")}
        onPress={() => {
          const next = !sound;
          setSound(next);
          void saveSoundOn(next);
        }}
      />
      <Body>{tr("Church lighting")}</Body>
      {(["auto", "day", "night"] as const).map((value) => (
        <Button
          key={value}
          secondary
          disabled={busy}
          title={`${(profile.churchLighting ?? "auto") === value ? "✓ " : ""}${tr(value === "auto" ? "Automatic lighting" : value === "day" ? "Day lighting" : "Night lighting")}`}
          onPress={() => void lighting(value)}
        />
      ))}
      <Button
        secondary
        title={tr("Show me around the church")}
        onPress={() => {
          requestChurchTour();
          router.push("/(tabs)");
        }}
      />
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
      <Notice text={error} />
    </Screen>
  );
}
