import { useState } from "react";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";
import { confessionAPI } from "../lib/confession";
import { Language, copy } from "../lib/content";
import { Button, Notice } from "./ui";
export default function ConfessionAudio({
  id,
  language,
}: {
  id: string;
  language: Language;
}) {
  const player = useAudioPlayer(null),
    status = useAudioPlayerStatus(player);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function play() {
    setBusy(true);
    try {
      if (status.playing) {
        player.pause();
        return;
      }
      const { url } = await confessionAPI("audio", { id });
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      player.replace({ uri: url });
      player.play();
    } catch {
      setError(copy(language, "cError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        secondary
        disabled={busy}
        title={copy(language, status.playing ? "pause" : "cPreview")}
        onPress={() => void play()}
      />
      <Notice text={error} />
    </>
  );
}
