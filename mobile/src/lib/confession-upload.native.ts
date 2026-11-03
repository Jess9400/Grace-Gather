import { File } from "expo-file-system";
import { fetch } from "expo/fetch";
import { playableAudio, clearPlayback } from "./storage";
export async function uploadConfession(
  data: Record<string, unknown>,
  id: string,
  token: string,
) {
  try {
    const file = new File(await playableAudio(id));
    if (file.size > 5242880) throw Error("invalid_audio");
    const form = new FormData();
    form.append("data", JSON.stringify(data));
    form.append("audio", file as unknown as Blob, "recording.m4a");
    const r = await fetch(
      process.env.EXPO_PUBLIC_SUPABASE_URL + "/functions/v1/confessions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        },
        body: form,
      },
    );
    const result = await r.json();
    if (!r.ok) throw Error(result.error || "unavailable");
    return result;
  } finally {
    clearPlayback();
  }
}
