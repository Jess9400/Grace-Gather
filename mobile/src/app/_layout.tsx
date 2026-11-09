import JournalCleanupNotice from "../components/JournalCleanupNotice";
import { View } from "react-native";
import { AudioRoomProvider } from "../lib/audio-room";
import ActiveRoomBar from "../components/ActiveRoomBar";
import { Stack, useSegments } from "expo-router";
import { QuietProvider } from "../lib/quiet-state";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "../lib/state";
import { Busy, Screen, Body, External, colors } from "../components/ui";
import { hasAnsweredTraditionQuestion } from "../lib/onboarding";
import { CommunityProvider } from "../lib/discussion-state";
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
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: legacy ? colors.paper : "#FFFCF3",
            },
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
              "prayers",
              "diary",
              "candle",
              "entry/[id]",
              "verse/[id]",
              "preferences",
              "practices",
              "giving",
              "history",
              "journal-export",
              "organizations",
              "course/[id]",
              "story/[id]",
              "gathering/[id]",
              "gathering/create",
              "testimonies/edit",
              "testimonies/index",
              "testimonies/review",
              "staff",
            ].map((name) => (
              <Stack.Screen key={name} name={name} />
            ))}
          </Stack.Protected>
        </Stack>
      </View>
      <JournalCleanupNotice compact />
      <ActiveRoomBar />
    </>
  );
}
export default function Layout() {
  return (
    <AppProvider>
      <QuietProvider>
        <CommunityProvider>
          <AudioRoomProvider>
            <Routes />
          </AudioRoomProvider>
        </CommunityProvider>
      </QuietProvider>
    </AppProvider>
  );
}
