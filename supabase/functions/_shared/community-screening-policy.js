export const SCREENING_FLAGS = Object.freeze([
  "abuse",
  "threat",
  "hate",
  "sexual_exploitation",
  "privacy",
  "spam",
  "self_harm",
  "needs_context",
]);
// Model output is an untrusted annotation. It carries no publication authority.
export function parseCommunityScreening(raw) {
  if (typeof raw !== "string" || raw.length > 4000)
    throw Error("invalid_model_response");
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw Error("invalid_model_response");
  }
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !Array.isArray(value.flags) ||
    value.flags.length > SCREENING_FLAGS.length ||
    value.flags.some((flag) => !SCREENING_FLAGS.includes(flag)) ||
    typeof value.summary !== "string" ||
    !value.summary.trim() ||
    value.summary.length > 600
  )
    throw Error("invalid_model_response");
  return { flags: [...new Set(value.flags)], summary: value.summary.trim() };
}

export async function readCommunityScreenRequest(request) {
  const limit = 1024;
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit)
    throw Error("invalid_request");
  if (!request.body) throw Error("invalid_request");
  const reader = request.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw Error("invalid_request");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const raw = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    raw.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let input;
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw));
  } catch {
    throw Error("invalid_request");
  }
  if (
    !input ||
    typeof input.postId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.postId,
    )
  )
    throw Error("invalid_request");
  return { postId: input.postId };
}
