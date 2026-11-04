import { Redirect } from "expo-router";
import { useApp } from "../lib/state";
export default function Index() {
  const { profile } = useApp();
  return (
    <Redirect
      href={
        profile.onboarded && profile.faithChoice !== undefined
          ? "/(tabs)"
          : "/onboarding"
      }
    />
  );
}
