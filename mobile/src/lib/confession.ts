import { requireUser } from "./backend";
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
  const { client } = await requireUser();
  if (audio) {
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session) throw Error("sign_in_required");
    return uploadConfession({ action, ...values }, audio, session.access_token);
  }
  const body = { action, ...values };
  const { data, error } = await client.functions.invoke("confessions", {
    body,
  });
  if (error) {
    let code = "unavailable";
    try {
      code = (await error.context?.json())?.error || code;
    } catch {}
    throw Error(code);
  }
  if (data?.error) throw Error(data.error);
  return data;
}
