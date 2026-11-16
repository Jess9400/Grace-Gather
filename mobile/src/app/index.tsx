import { Redirect } from "expo-router";
import { useApp } from "../lib/state";
import { hasCompletedOnboarding } from "../lib/onboarding";
export default function Index() {
  const { profile } = useApp();
  return (
    <Redirect
      href={hasCompletedOnboarding(profile) ? "/(tabs)" : "/onboarding"}
    />
  );
}
