import { requireBackend } from "./backend";
import { uploadConfession } from "./confession-upload";
export interface Confession {
  id: string;
  kind: "confession" | "reply";
  parent?: string;
  body: string;
  theme: string;
  responseType: string;
  language: "en" | "pt" | "es" | "ru";
  status: "pending" | "approved" | "reported" | "rejected";
  created: number;
  closed: boolean;
  thanked: boolean;
  hasAudio: boolean;
  mine: boolean;
  reservedUntil: number | null;
  priority?: number;
  signals?: string[];
}
export interface ConfessionResult {
  item: Confession;
  reply: Confession | null;
  items: Confession[];
  reserved: Confession[];
  moderator: boolean;
  supportSuggested: boolean;
  url: string;
}
export async function confessionAPI(
  action: string,
  values: Record<string, unknown> = {},
  audio?: string,
): Promise<ConfessionResult> {
  const client = requireBackend();
  // The sign-in kept on this device says whether to ask at all; the server
  // checks it on every request, so asking it first only added a wait.
  const {
    data: { session },
    error: authError,
  } = await client.auth.getSession();
  if (!session || authError) throw Error("sign_in_required");
  if (audio)
    return uploadConfession({ action, ...values }, audio, session.access_token);
  const body = { action, ...values };
  const { data, error } = await client.functions.invoke("confessions", {
    body,
  });
  if (error) {
    let code =
      error.context?.status === 401 ? "sign_in_required" : "unavailable";
    try {
      code = (await error.context?.json())?.error || code;
    } catch {}
    throw Error(code);
  }
  if (data?.error) throw Error(data.error);
  return data;
}
