import { FunctionsHttpError } from "@supabase/supabase-js";

// Inspect only the server's error code; never expose response bodies or writing.
export async function aiRequestError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error === "rate_limited") return Error("rate_limited");
      if (body?.error === "daily_reflection_limit")
        return Error("daily_reflection_limit");
      if (body?.error === "daily_chat_limit") return Error("daily_chat_limit");
      if (body?.error === "provider_busy") return Error("provider_busy");
      if (body?.error === "unauthorized") return Error("Sign in to continue");
    } catch {
      /* A malformed error body remains a generic failure. */
    }
  }
  return Error("ai_unavailable");
}
