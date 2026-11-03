import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { requireUser } from "./backend";
import { playableAudio, clearPlayback } from "./storage";
import { AI_CONSENT_VERSION } from "./ai-copy";
import { Language } from "./content";
export async function transcribeRecording(id: string, language: Language) {
  const { client } = await requireUser();
  const { data } = await client.auth.getSession();
  if (!data.session) throw Error("unauthorized");
  try {
    const file = new File(await playableAudio(id));
    if (file.size > 5242880) throw Error("too_large");
    const form = new FormData();
    form.append("audio", file as unknown as Blob, "recording.m4a");
    form.append("language", language);
    form.append("consentVersion", AI_CONSENT_VERSION);
    const result = await fetch(
      process.env.EXPO_PUBLIC_SUPABASE_URL + "/functions/v1/llm-transcribe",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + data.session.access_token,
          apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        },
        body: form,
        signal: AbortSignal.timeout(55000),
      },
    );
    const body = await result.json();
    if (!result.ok || typeof body.transcript !== "string")
      throw Error("transcription_failed");
    return body.transcript as string;
  } finally {
    clearPlayback();
  }
}
