import { useEffect, useState } from "react";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";
import { playableAudio, clearPlayback } from "../lib/storage";
import { Button, Notice } from "./quiet-ui";
import { Language, copy } from "../lib/content";
import { label } from "../lib/labels";
export default function AudioPlayback({
  id,
  language,
}: {
  id: string;
  language: Language;
}) {
  const player = useAudioPlayer(null),
    status = useAudioPlayerStatus(player);
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      clearPlayback();
    },
    [],
  );
  async function play() {
    try {
      if (status.playing) {
        player.pause();
        return;
      }
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      player.replace({ uri: await playableAudio(id) });
      if (status.didJustFinish) await player.seekTo(0);
      player.play();
    } catch {
      setError(copy(language, "socialError"));
    }
  }
  return (
    <>
      <Button
        secondary
        title={
          status.playing ? copy(language, "pause") : label(language, "play")
        }
        onPress={() => void play()}
      />
      <Notice text={error} />
    </>
  );
}
