import { backend, requireUser } from "./backend";
import * as storage from "./storage";
export type Membership = {
  plan: "free" | "pro";
  admin: boolean;
  entries: number;
  followups: number;
  studyRemaining: number;
  resetsAt: string;
  studyResetsAt: string;
  expiresAt: string | null;
  enforced: boolean;
  timeZone?: string;
};
export type UpgradeReason =
  | "pro"
  | "membership"
  | "journal_entry_limit"
  | "journal_followup_limit"
  | "study_monthly_limit";
const subscribers = new Set<() => void>();
let lastReason: UpgradeReason | null = null;
export function showUpgrade(reason: UpgradeReason = "pro") {
  lastReason = reason;
  subscribers.forEach((fn) => fn());
}
export function closeUpgrade() {
  lastReason = null;
  subscribers.forEach((fn) => fn());
}
export function upgradeSnapshot() {
  return lastReason;
}
export function onUpgrade(fn: () => void) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}
export function isMembershipLimit(error: unknown): error is Error {
  return (
    error instanceof Error &&
    [
      "pro_required",
      "journal_entry_limit",
      "journal_followup_limit",
      "study_monthly_limit",
    ].includes(error.message)
  );
}
export function upgradeForError(error: unknown) {
  if (isMembershipLimit(error)) {
    showUpgrade(
      error.message === "pro_required"
        ? "pro"
        : (error.message as UpgradeReason),
    );
    return true;
  }
  return false;
}
export async function membershipStatus(): Promise<Membership> {
  const { client } = await requireUser();
  const { data, error } = await client.rpc("membership_status");
  if (error || !data) throw Error("membership_unavailable");
  return data as Membership;
}
export async function syncPurchases(): Promise<Membership> {
  const { client } = await requireUser();
  const { data, error } = await client.functions.invoke("membership-sync");
  if (error || !data) throw Error("membership_unavailable");
  return data as Membership;
}
// Build-time release guard: unfinished billing must not lock an existing app.
// This never bypasses the server's entitlement checks on protected resources.
export function proBillingUIEnabled() {
  return process.env.EXPO_PUBLIC_PRO_BILLING_ENABLED === "true";
}
async function proUnlocked() {
  if (!proBillingUIEnabled()) return true;
  try {
    const value = await membershipStatus();
    return value.enforced === false || value.admin || value.plan === "pro";
  } catch {
    /* No client profile or local preference can unlock Pro. The sheet offers Retry. */
    return false;
  }
}
export async function requireProAction(action: () => void) {
  if (await proUnlocked()) {
    action();
    return true;
  }
  showUpgrade();
  return false;
}
// Entering Pro offers the upgrade at most once a day; tapping a locked tool
// still offers it every time.
export async function offerUpgradeOnVisit() {
  if (await proUnlocked()) return;
  const now = new Date();
  const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  try {
    if ((await storage.getItem("pro-offer-shown")) === today) return;
    await storage.setItem("pro-offer-shown", today);
  } catch {
    /* Without storage, offer it; the sheet closes with ×. */
  }
  showUpgrade();
}
// Daily allowances reset at the member's local midnight; the server learns
// the time zone from the device.
export async function syncTimeZone() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!zone) return;
  const { client } = await requireUser();
  await client.rpc("set_time_zone", { p_time_zone: zone });
}
export function subscribeMembershipAccount(onChange: () => void) {
  let owner: string | null | undefined;
  return backend?.auth.onAuthStateChange((event, session) => {
    const next = session?.user.id ?? null;
    if (event === "SIGNED_OUT" || (owner !== undefined && next !== owner))
      onChange();
    owner = next;
  }).data.subscription;
}
