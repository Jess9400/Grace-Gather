import { Redirect } from "expo-router";
import { useApp } from "../lib/state";
export default function Index() {
  return (
    <Redirect href={useApp().profile.onboarded ? "/(tabs)" : "/onboarding"} />
  );
}
