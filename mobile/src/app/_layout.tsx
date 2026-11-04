import { Stack, useSegments } from "expo-router";
import { QuietProvider } from "../lib/quiet-state";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "../lib/state";
import { Busy, Screen, Body, External, colors } from "../components/ui";
import { hasAnsweredTraditionQuestion } from "../lib/onboarding";
import { CommunityPreviewProvider } from "../lib/discussion-state";
function Routes() {
  const { ready, error, profile } = useApp();
  const legacy = useSegments().some((s) => s === "confession");
  if (error)
    return (
      <Screen>
        <Body>{error}</Body>
        <External
          title="Contact Grace & Gather"
          url="mailto:hello@graceandgather.com"
        />
      </Screen>
    );
  if (!ready)
    return (
      <Screen>
        <Busy />
      </Screen>
    );
  return (
    <>
      <StatusBar style={legacy ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: legacy ? colors.paper : "#FFFCF3" },
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="account" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="restore" />
        <Stack.Protected
          guard={hasAnsweredTraditionQuestion(profile)}
          redirectTo="/onboarding"
        >
          {[
            "index",
            "(tabs)",
            "library",
            "community",
            "diary",
            "entry/[id]",
            "verse/[id]",
            "preferences",
            "giving",
            "history",
            "organizations",
            "course/[id]",
            "story/[id]",
            "gathering/[id]",
            "staff",
          ].map((name) => (
            <Stack.Screen key={name} name={name} />
          ))}
        </Stack.Protected>
      </Stack>
    </>
  );
}
export default function Layout() {
  return (
    <AppProvider>
      <QuietProvider>
        <CommunityPreviewProvider>
          <Routes />
        </CommunityPreviewProvider>
      </QuietProvider>
    </AppProvider>
  );
}
