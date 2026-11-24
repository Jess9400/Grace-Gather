import { requireUser } from "./backend";
export type StudyNote = {
  verse: string;
  reference: string;
  body: string;
  updated_at: string;
};
export type PlanInvite = {
  id: string;
  plan: number;
  name: string;
  peer: string;
  outgoing: boolean;
  status: "pending" | "accepted";
};
export type SharedStudyNote = StudyNote & {
  id: string;
  mine: boolean;
  name: string;
};
export async function studyNotebook<T>(
  action: string,
  data: Record<string, unknown> = {},
): Promise<T> {
  const { client } = await requireUser();
  const result = await client.rpc("study_notebook", {
    p_action: action,
    p_data: data,
  });
  if (result.error) throw result.error;
  return result.data as T;
}
