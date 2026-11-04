import { backend, requireUser } from "./backend";
import { Localized, Language } from "./content";
export interface Gathering {
  id: string;
  title: Localized;
  description: Localized;
  host_id: string;
  host_name: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  capacity: number;
  status: string;
  visibility: "public" | "invite";
  topic: string;
  language: Language;
  reserved?: boolean;
  hosting?: boolean;
}
export async function gathering(
  action: string,
  data: Record<string, unknown> = {},
) {
  if (!backend) throw Error("unavailable");
  if (!["list", "details"].includes(action)) await requireUser();
  const r = await backend.rpc("gathering_command", {
    p_action: action,
    p_data: data,
  });
  if (r.error) throw Error(r.error.message);
  return r.data;
}
export async function audioCommand(
  action: string,
  data: Record<string, unknown> = {},
) {
  const { client } = await requireUser();
  const r = await client.functions.invoke("gathering-token", {
    body: { action, ...data },
  });
  if (r.error) {
    let code = "audioUnavailable";
    try {
      code = (await r.error.context?.json())?.error ?? code;
    } catch {}
    throw Error(code);
  }
  if (r.data?.error) throw Error(r.data.error);
  return r.data;
}
export const gatheringLink = (id: string, invite?: string) =>
  "https://still-soul-journal-jessica.inanipratyaksh.chatgpt.site/app/gathering/" +
  encodeURIComponent(id) +
  (invite ? "?invite=" + encodeURIComponent(invite) : "");
