import { createClient } from "npm:@supabase/supabase-js@2.118.0";
export const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
export function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error("service_not_configured");
  return value;
}
// Prefer independently rotatable keys; retain compatibility with older runtimes.
export function apiKey(kind: "publishable" | "secret") {
  const dictionary = Deno.env.get(kind === "secret" ? "SUPABASE_SECRET_KEYS" : "SUPABASE_PUBLISHABLE_KEYS");
  if (dictionary) {
    const key = JSON.parse(dictionary).default;
    if (typeof key !== "string" || !key) throw new Error("service_not_configured");
    return key;
  }
  return env(kind === "secret" ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_ANON_KEY");
}
export const admin = () =>
  createClient(env("SUPABASE_URL"), apiKey("secret"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
export async function identity(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!token) throw new Error("unauthorized");
  const service = admin();
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) throw new Error("unauthorized");
  const client = createClient(env("SUPABASE_URL"), apiKey("publishable"), {
    global: { headers: { Authorization: "Bearer " + token } },
    auth: { persistSession: false },
  });
  return { user: data.user, service, client };
}
export function serve(fn: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers });
    if (!["POST", "GET"].includes(req.method))
      return json({ error: "method_not_allowed" }, 405);
    try {
      return await fn(req);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      return json(
        {
          error:
            code === "unauthorized"
              ? "unauthorized"
              : code === "service_not_configured"
                ? "service_not_configured"
                : "request_failed",
        },
        code === "unauthorized" ? 401 : 503,
      );
    }
  });
}
