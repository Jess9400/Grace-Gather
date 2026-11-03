import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.2.15";
import { serve, identity, json, env } from "../_shared/http.ts";
import { appleSecret, seal } from "../_shared/apple.ts";
const keys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const { user, service } = await identity(req);
  const body = await req.json();
  if (typeof body.code !== "string" || body.code.length > 2048)
    return json({ error: "invalid_code" }, 400);
  const apple = user.identities?.find((i) => i.provider === "apple");
  if (!apple) return json({ error: "apple_identity_required" }, 403);
  const response = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("APPLE_CLIENT_ID"),
      client_secret: await appleSecret(),
      code: body.code,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return json({ error: "apple_exchange_failed" }, 400);
  const tokens = await response.json();
  const { payload } = await jwtVerify(tokens.id_token, keys, {
    issuer: "https://appleid.apple.com",
    audience: env("APPLE_CLIENT_ID"),
  });
  if (payload.sub !== apple.identity_data?.sub || !tokens.refresh_token)
    return json({ error: "identity_mismatch" }, 403);
  const { error } = await service.rpc("store_apple_token", {
    p_user: user.id,
    p_token: await seal(tokens.refresh_token),
  });
  if (error) throw error;
  return json({ saved: true });
});
