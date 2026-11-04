import { Redirect } from "expo-router";

// Preserve old links while the profile icon opens the unified More hub.
export default function More() {
  return <Redirect href="/account" />;
}
