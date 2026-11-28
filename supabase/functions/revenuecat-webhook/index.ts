import { serve, admin, json } from "../_shared/http.ts";
import { readBounded } from "../_shared/journey-policy.js";
import { syncMembership } from "../_shared/pro-membership.ts";
serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const expected = Deno.env.get("REVENUECAT_WEBHOOK_AUTHORIZATION");
  if (!expected) return json({ error: "service_not_configured" }, 503);
  // A dedicated webhook credential; never accept the app's public API key.
  const digest = async (value: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    );
  const [a, b] = await Promise.all([
    digest(expected),
    digest(req.headers.get("authorization") || ""),
  ]);
  if (a.reduce((diff, value, i) => diff | (value ^ b[i]), 0) !== 0)
    return json({ error: "unauthorized" }, 401);
  const payload = JSON.parse(await (await readBounded(req, 32000)).text());
  const event = payload?.event;
  if (!event || typeof event.id !== "string")
    return json({ error: "invalid_event" }, 400);
  if (event.type === "TEST") return json({ received: true });
  const users = [
    ...new Set([
      event.app_user_id,
      ...(Array.isArray(event.transferred_from) ? event.transferred_from : []),
      ...(Array.isArray(event.transferred_to) ? event.transferred_to : []),
    ]),
  ].filter(
    (id): id is string => typeof id === "string" && /^[a-f0-9-]{36}$/i.test(id),
  );
  if (users.length > 20) return json({ error: "invalid_event" }, 400);
  // Fetch the current verified snapshot, so duplicate/out-of-order notifications converge.
  for (const user of users) await syncMembership(admin(), user);
  return json({ received: true });
});
