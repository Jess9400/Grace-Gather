import { SignJWT, importPKCS8 } from "npm:jose@6.2.15";
import { env } from "./http.ts";
export async function appleSecret() {
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env("APPLE_KEY_ID") })
    .setIssuer(env("APPLE_TEAM_ID"))
    .setSubject(env("APPLE_CLIENT_ID"))
    .setAudience("https://appleid.apple.com")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(
      await importPKCS8(
        env("APPLE_PRIVATE_KEY").replaceAll("\\n", "\n"),
        "ES256",
      ),
    );
}
async function key() {
  return crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(env("TOKEN_ENCRYPTION_KEY_BASE64")), (c) =>
      c.charCodeAt(0),
    ),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function seal(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await key(),
      new TextEncoder().encode(value),
    ),
  );
  return btoa(String.fromCharCode(...iv, ...encrypted));
}
export async function unseal(value: string) {
  const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.slice(0, 12) },
      await key(),
      bytes.slice(12),
    ),
  );
}
export async function revokeApple(token: string) {
  const response = await fetch("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("APPLE_CLIENT_ID"),
      client_secret: await appleSecret(),
      token,
      token_type_hint: "refresh_token",
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("apple_revoke_failed");
}
