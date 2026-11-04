import { Profile } from "./content";
export const TRADITION_QUESTION_VERSION = 1;
export function hasAnsweredTraditionQuestion(profile: Profile) {
  return (
    profile.onboarded &&
    profile.traditionQuestionVersion === TRADITION_QUESTION_VERSION &&
    ["orthodox", "catholic", "protestant", "exploring", "unspecified"].includes(
      profile.faithChoice ?? "",
    )
  );
}
