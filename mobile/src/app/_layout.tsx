import { View } from "react-native";
import { AudioRoomProvider } from "../lib/audio-room";
import ActiveRoomBar from "../components/ActiveRoomBar";
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
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
          }}
        />
      </View>
      <ActiveRoomBar />
    </>
  );
}
export default function Layout() {
  return (
    <AppProvider>
      <AudioRoomProvider>
        <Routes />
      </AudioRoomProvider>
    </AppProvider>
  );
}
