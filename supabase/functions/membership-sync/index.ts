import { serve, identity, json } from "../_shared/http.ts";
import { syncMembership } from "../_shared/pro-membership.ts";
serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const { user, service, client } = await identity(req);
  try {
    await syncMembership(service, user.id);
    const { data, error } = await client.rpc("membership_status");
    if (error) throw error;
    return json(data);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return json(
      {
        error: code === "billing_not_configured" ? code : "billing_unavailable",
      },
      503,
    );
  }
});
