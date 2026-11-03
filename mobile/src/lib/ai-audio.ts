import { Language } from "./content";
export async function transcribeRecording(
  _id: string,
  _language: Language,
): Promise<string> {
  throw Error("native_recording_required");
}
