import { requireUser } from "./backend";
export type DevotionalRead = {
  id: string;
  seenAt: string;
  completedAt: string | null;
  steps: number;
};
export async function devotionalHistory(): Promise<DevotionalRead[]> {
  const { client } = await requireUser();
  const result = await client.rpc("devotional_history", { p_action: "list" });
  if (result.error) throw result.error;
  return result.data;
}
export async function recordDevotional(
  id: string,
  steps = 0,
): Promise<DevotionalRead> {
  const { client } = await requireUser();
  const result = await client.rpc("devotional_history", {
    p_action: "record",
    p_data: { id, steps },
  });
  if (result.error) throw result.error;
  return result.data;
}
