import { Redirect } from "expo-router";
import { useApp } from "../lib/state";
import { hasAnsweredTraditionQuestion } from "../lib/onboarding";
export default function Index() {
  const { profile } = useApp();
  return (
    <Redirect
      href={hasAnsweredTraditionQuestion(profile) ? "/(tabs)" : "/onboarding"}
    />
  );
}
