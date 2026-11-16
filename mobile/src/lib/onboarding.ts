import { Profile } from "./content";
export const TRADITION_QUESTION_VERSION = 1;
// Raise this when the Terms of Use change, so everyone agrees to them again.
export const TERMS_VERSION = 1;
export function hasAcceptedTerms(profile: Profile) {
  return profile.termsVersion === TERMS_VERSION;
}
export function hasAnsweredTraditionQuestion(profile: Profile) {
  return (
    profile.onboarded &&
    profile.traditionQuestionVersion === TRADITION_QUESTION_VERSION &&
    ["orthodox", "catholic", "protestant", "exploring", "unspecified"].includes(
      profile.faithChoice ?? "",
    )
  );
}
// The church opens once the tradition question is answered and the Terms of
// Use are agreed.
export function hasCompletedOnboarding(profile: Profile) {
  return hasAnsweredTraditionQuestion(profile) && hasAcceptedTerms(profile);
}
