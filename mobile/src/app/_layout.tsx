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
import { useSignedIn } from "../lib/account";
import ModeratorPushListener from "../components/ModeratorPushListener";
function Routes() {
  const { ready, error, profile } = useApp();
  const signedIn = useSignedIn();
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
  if (!ready || signedIn === null)
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
            contentStyle: {
              backgroundColor: legacy ? colors.paper : "#1B1612",
            },
          }}
        >
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="restore" />
          <Stack.Protected guard={signedIn} redirectTo="/sign-in">
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="account" />
            <Stack.Protected
              guard={hasAnsweredTraditionQuestion(profile)}
              redirectTo="/onboarding"
            >
              {[
                "index",
                "(tabs)",
                "admin/index",
                "friends",
                "moderation",
                "my-calendar",
                "notifications",
                "profile",
                "study",
                "library",
                "community",
                "prayers",
                "diary",
                "candle",
                "entry/[id]",
                "verse/[id]",
                "preferences",
                "practices",
                "pray",
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
                "intro",
              ].map((name) => (
                <Stack.Screen key={name} name={name} />
              ))}
            </Stack.Protected>
          </Stack.Protected>
        </Stack>
      </View>
      <JournalCleanupNotice compact />
      <ActiveRoomBar />
      <ModeratorPushListener />
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
