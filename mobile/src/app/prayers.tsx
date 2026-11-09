import { Redirect, useLocalSearchParams } from "expo-router";
import PrayerPage from "../components/PrayerPage";
export default function Prayers() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  if (tab === "notifications") return <Redirect href="/notifications" />;
  if (tab === "review") return <Redirect href="/moderation" />;
  return <PrayerPage />;
}
