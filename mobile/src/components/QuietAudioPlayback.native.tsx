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
import { backend } from "../lib/backend";
import { isMemberSession } from "../lib/account";
import { ensureJournalAudio } from "../lib/account-journal-audio";
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
      const session = await backend?.auth.getSession();
      if (!session || !isMemberSession(session.data.session))
        throw Error("journal_account_unavailable");
      const audioId = await ensureJournalAudio(
        session.data.session!.user.id,
        id,
      );
      player.replace({ uri: await playableAudio(audioId) });
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
