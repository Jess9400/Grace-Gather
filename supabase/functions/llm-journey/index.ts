import { serve, identity, json } from "../_shared/http.ts";
// This adapter is intentionally disabled until the user connects their LLM provider.
// Future input requires separate, explicit consent. Never log journal text/audio.
serve(async (req) => {
  await identity(req);
  return json(
    {
      error: "llm_not_connected",
      mode: "explicit_feeling",
      message: "Choose a feeling to select curated passages and actions.",
    },
    501,
  );
});
