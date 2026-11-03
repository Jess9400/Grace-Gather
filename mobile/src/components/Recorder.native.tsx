import { useEffect, useRef, useState } from "react";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { randomUUID } from "expo-crypto";
import { Button, Body, Notice } from "./ui";
import { protectAudio, removeAudio } from "../lib/storage";
import { Language, copy } from "../lib/content";
import { label } from "../lib/labels";
export default function Recorder({
  language,
  value,
  onChange,
  onBusyChange,
}: {
  language: Language;
  value?: string;
  onChange: (id?: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const wasRecording = useRef(false),
    saving = useRef(false);
  useEffect(() => {
    onBusyChange(state.isRecording || busy);
  }, [state.isRecording, busy, onBusyChange]);
  useEffect(() => {
    if (state.isRecording) wasRecording.current = true;
    if (
      wasRecording.current &&
      !state.isRecording &&
      recorder.uri &&
      !saving.current
    ) {
      wasRecording.current = false;
      saving.current = true;
      setBusy(true);
      protectAudio(recorder.uri, randomUUID())
        .then(onChange)
        .catch(() => setError(copy(language, "storageError")))
        .finally(() => {
          saving.current = false;
          setBusy(false);
        });
    }
  }, [state.isRecording, recorder.uri, language, onChange]);
  async function start() {
    setError("");
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError(copy(language, "micError"));
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: 300 });
    } catch {
      setError(copy(language, "micError"));
    }
  }
  return (
    <>
      <Notice text={error} />
      {value ? (
        <>
          <Body small>{label(language, "recorded")}</Body>
          <Button
            secondary
            title={copy(language, "removeAudio")}
            onPress={() => {
              void removeAudio(value).then(() => onChange(undefined));
            }}
          />
        </>
      ) : (
        <Button
          secondary
          disabled={busy}
          title={
            state.isRecording
              ? `${copy(language, "stop")} · ${Math.floor(state.durationMillis / 1000)}s`
              : copy(language, "record")
          }
          onPress={() => {
            if (state.isRecording)
              void recorder
                .stop()
                .catch(() => setError(copy(language, "micError")));
            else void start();
          }}
        />
      )}
    </>
  );
}
