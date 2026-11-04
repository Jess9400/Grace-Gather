import { Stack, useSegments } from "expo-router";
import { QuietProvider } from "../lib/quiet-state";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "../lib/state";
import { Busy, Screen, Body, External, colors } from "../components/ui";
function Routes() {
  const { ready, error } = useApp();
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
      />
    </>
  );
}
export default function Layout() {
  return (
    <AppProvider>
      <QuietProvider>
        <Routes />
      </QuietProvider>
    </AppProvider>
  );
}
