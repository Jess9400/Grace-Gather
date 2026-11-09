import { requireUser } from "./backend";
export type Friend = {
  id: string;
  peer: string;
  name: string;
  status: "pending" | "accepted";
  outgoing: boolean;
};
export type Message = {
  id: string;
  body: string;
  mine: boolean;
  created_at: string;
};
export async function friends(
  action: string,
  data: Record<string, unknown> = {},
) {
  const { client } = await requireUser();
  const result = await client.rpc("friends_command", {
    p_action: action,
    p_data: data,
  });
  if (result.error) throw result.error;
  return result.data;
}
