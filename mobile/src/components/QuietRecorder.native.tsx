import { useEffect, useRef, useState } from "react";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { randomUUID } from "expo-crypto";
import { Button, Body, Notice } from "./quiet-ui";
import { protectAudio, removeAudio } from "../lib/storage";
import { Language, copy } from "../lib/content";
import { label } from "../lib/labels";
import { suspendAmbience } from "../lib/church-audio";
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
    saving = useRef(false),
    restoreSound = useRef<(() => void) | null>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      restoreSound.current?.();
      restoreSound.current = null;
    };
  }, []);
  useEffect(() => {
    onBusyChange(state.isRecording || busy);
  }, [state.isRecording, busy, onBusyChange]);
  useEffect(() => {
    if (state.isRecording) wasRecording.current = true;
    if (wasRecording.current && !state.isRecording) {
      restoreSound.current?.();
      restoreSound.current = null;
    }
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
    setBusy(true);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError(copy(language, "micError"));
        return;
      }
      const restore = await suspendAmbience();
      if (!mounted.current) { restore(); return; }
      restoreSound.current = restore;
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: 300 });
    } catch {
      restoreSound.current?.();
      restoreSound.current = null;
      setError(copy(language, "micError"));
    } finally {
      if (mounted.current) setBusy(false);
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
