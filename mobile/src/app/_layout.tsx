import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "../lib/state";
import { Busy, Screen, Body, External, colors } from "../components/ui";
function Routes() {
  const { ready, error } = useApp();
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
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      />
    </>
  );
}
export default function Layout() {
  return (
    <AppProvider>
      <Routes />
    </AppProvider>
  );
}
