import { requireUser } from "./backend";

// Bible Study progress saved to the account, so it follows the reader to a
// new phone or the web. Scopes: "plans-<edition>" and "today".
export async function readAccountStudy(
  scope: string,
): Promise<{ state: unknown; updated_at: string } | null> {
  const { client } = await requireUser();
  const result = await client.rpc("study_progress", {
    p_action: "get",
    p_data: { scope },
  });
  if (result.error) throw result.error;
  return result.data as { state: unknown; updated_at: string } | null;
}
export async function saveAccountStudy(scope: string, state: object) {
  const { client } = await requireUser();
  const result = await client.rpc("study_progress", {
    p_action: "save",
    p_data: { scope, state },
  });
  if (result.error) throw result.error;
}
