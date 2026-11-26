import { admin } from "./http.ts";
type Service = ReturnType<typeof admin>;
type MemberClient = {
  rpc: (name: string) => PromiseLike<{ data: any; error: any }>;
};
export async function refreshPaidMembership(
  client: MemberClient,
  service: Service,
  user: string,
) {
  const { data, error } = await client.rpc("membership_status");
  if (error || !data) throw Error("service_not_configured");
  if (
    data.enforced &&
    !data.admin &&
    data.verifiedAt &&
    Date.now() - Date.parse(data.verifiedAt) > 300000
  ) {
    await syncMembership(service, user);
    const next = await client.rpc("membership_status");
    if (next.error || !next.data) throw Error("service_not_configured");
    return next.data;
  }
  return data;
}
export async function requirePro(
  client: MemberClient,
  service: Service,
  user: string,
) {
  const data = await refreshPaidMembership(client, service, user);
  if (data.enforced && !data.admin && data.plan !== "pro")
    throw Error("pro_required");
}
/** Query RevenueCat on the server. No client-supplied purchase claim is trusted. */
export async function syncMembership(service: Service, user: string) {
  const key = Deno.env.get("REVENUECAT_SECRET_KEY");
  if (!key) throw Error("billing_not_configured");
  if (!/^[a-f0-9-]{36}$/i.test(user)) throw Error("invalid_user");
  const response = await fetch(
    "https://api.revenuecat.com/v1/subscribers/" + encodeURIComponent(user),
    {
      headers: { Authorization: "Bearer " + key, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    },
  );
  if (!response.ok) throw Error("billing_unavailable");
  const data = await response.json();
  const entitlement =
    data?.subscriber?.entitlements?.[
      Deno.env.get("REVENUECAT_PRO_ENTITLEMENT") || "grace_gather_pro"
    ];
  const subscription = entitlement?.product_identifier
    ? data.subscriber?.subscriptions?.[entitlement.product_identifier]
    : null;
  const allowedProducts = (
    Deno.env.get("PRO_PRODUCT_IDS") ||
    "gracegather_pro_monthly,gracegather_pro_yearly"
  ).split(",");
  const expiration = Date.parse(entitlement?.expires_date ?? "");
  const grace = Date.parse(subscription?.grace_period_expires_date ?? "");
  const until =
    Number.isFinite(grace) && grace > expiration ? grace : expiration;
  const sandbox = subscription?.is_sandbox === true;
  const active =
    !!entitlement &&
    allowedProducts.includes(entitlement.product_identifier) &&
    Number.isFinite(until) &&
    until > Date.now() &&
    !subscription?.refunded_at &&
    (!sandbox || Deno.env.get("PRO_ALLOW_SANDBOX") === "true");
  const source = Date.parse(data.request_date ?? "");
  if (!Number.isFinite(source)) throw Error("invalid_billing_snapshot");
  const { error } = await service.rpc("sync_pro_entitlement", {
    p_user: user,
    p_active: active,
    p_expires: Number.isFinite(until) ? new Date(until).toISOString() : null,
    p_environment: sandbox ? "sandbox" : "production",
    p_source_time: new Date(source).toISOString(),
  });
  if (error) throw Error("billing_sync_failed");
  return active;
}
export async function reserveJournal(
  service: Service,
  user: string,
  kind: "entry" | "followup" | "study",
  input: unknown,
) {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const key = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const { data, error } = await service.rpc("reserve_journal_allowance", {
    p_user: user,
    p_kind: kind,
    p_key: key,
  });
  if (error || !data) throw Error("service_not_configured");
  if (!data.allowed) throw Error(data.error || "rate_limited");
  return data as { id?: string; replay: boolean; result?: unknown };
}
export async function finishJournal(
  service: Service,
  user: string,
  id: string | undefined,
  result: unknown = null,
) {
  if (!id) return;
  const { error } = await service.rpc("finish_journal_allowance", {
    p_user: user,
    p_id: id,
    p_result: result,
  });
  if (error) throw Error("service_not_configured");
}
