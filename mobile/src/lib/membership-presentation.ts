import type { Membership, UpgradeReason } from "./membership";
/** A limit is a pause for existing subscribers, never another purchase offer. */
export function membershipPresentation(
  reason: UpgradeReason | null,
  member: Membership | null,
  platform: string,
  enabled = true,
) {
  const paid = !!member && (member.admin || member.plan === "pro");
  const limit =
    !!reason &&
    [
      "journal_entry_limit",
      "journal_followup_limit",
      "study_monthly_limit",
    ].includes(reason);
  const billing = enabled && !!member && !member.admin;
  return {
    paid,
    paused: enabled && paid && limit,
    showBenefits: enabled && (!limit || !paid),
    showOffers: billing && !paid && platform === "ios",
    showRestore: billing && platform === "ios" && !(paid && limit),
    showManage: billing && paid && !limit,
    showWebNotice: billing && !paid && platform !== "ios",
  };
}
