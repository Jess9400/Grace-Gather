export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const validEmail = (value: string) =>
  value.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
export function suggestedEmail(value: string) {
  const email = normalizeEmail(value);
  if (!validEmail(email)) return "";
  const [name, domain] = email.split("@");
  const corrections: Record<string, string> = {
    "gmasil.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmai.com": "gmail.com",
    "gmail.con": "gmail.com",
    "hotmial.com": "hotmail.com",
    "outlok.com": "outlook.com",
  };
  return corrections[domain] ? `${name}@${corrections[domain]}` : "";
}
export const normalizeCode = (value: string) => value.replace(/\s/g, "");
export const validCode = (value: string) =>
  /^\d{6,10}$/.test(normalizeCode(value));
export const resendSeconds = (nextSend: number, now = Date.now()) =>
  Math.max(0, Math.ceil((nextSend - now) / 1000));

// Only display authored messages. Provider errors can expose implementation
// details or include account data and must not be rendered verbatim.
export function authErrorKey(error: unknown, action: "send" | "verify") {
  const e = error as { code?: string; status?: number; name?: string } | null;
  if (e?.status === 429 || e?.code?.startsWith("over_")) return "authRateLimit";
  if (e?.code === "otp_expired" || e?.code === "invalid_credentials")
    return "authInvalidCode";
  if (e?.code === "email_address_invalid" || e?.code === "validation_failed")
    return "authInvalidEmail";
  if (
    (e?.name === "AuthRetryableFetchError" && !e.status) ||
    e?.name === "TypeError" ||
    e?.code === "request_timeout"
  )
    return "authNetworkError";
  return action === "send" ? "authSendError" : "authVerifyError";
}
