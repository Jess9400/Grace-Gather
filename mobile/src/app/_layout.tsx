import ProPaywall from "../components/ProPaywall";
import JournalCleanupNotice from "../components/JournalCleanupNotice";
import { ActivityIndicator, View } from "react-native";
import BrandMark from "../components/BrandMark";
import { AudioRoomProvider } from "../lib/audio-room";
import ActiveRoomBar from "../components/ActiveRoomBar";
import { Stack, useSegments } from "expo-router";
import { QuietProvider } from "../lib/quiet-state";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "../lib/state";
import { Screen, Body, Button, External, colors } from "../components/ui";
import { hasCompletedOnboarding } from "../lib/onboarding";
import { CommunityProvider } from "../lib/discussion-state";
import { useSignedIn } from "../lib/account";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import ModeratorPushListener from "../components/ModeratorPushListener";
import AppRatingListener from "../components/AppRatingListener";
import IntroHandoff from "../components/IntroHandoff";
import { useVerseWidget } from "../lib/use-verse-widget";
import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { backend } from "../lib/backend";
import { identifyAccount, startAnalytics } from "../lib/analytics";

function Routes() {
  const {
    ready,
    error,
    profile,
    profileReady,
    profileUnavailable,
    retryProfile,
  } = useApp();
  const signedIn = useSignedIn();
  const widgetProfileReady = signedIn && ready && profileReady && !profileUnavailable && hasCompletedOnboarding(profile);
  useVerseWidget(signedIn === false ? null : widgetProfileReady ? profile.edition : undefined);
  const legacy = useSegments().some((s) => s === "confession");
  const tr = useInterfaceCopy();
  if (error)
    return (
      <Screen>
        <Body>{tr(error)}</Body>
        <External
          title={tr("Contact Grace & Gather")}
          url="mailto:hello@graceandgather.online"
        />
      </Screen>
    );
  if (!ready || signedIn === null || (signedIn && !profileReady))
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", gap: 24 }}>
        <BrandMark size={76} />
        <ActivityIndicator color={colors.gold} accessibilityLabel={tr("Loading")} />
      </View>
    );
  if (signedIn && profileUnavailable)
    return (
      <Screen>
        <Body>
          {tr(
            "Could not load your profile. Please check your connection and try again.",
          )}
        </Body>
        <Button title={tr("Try again")} onPress={() => void retryProfile()} />
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
          <Stack.Screen name="terms" />
          <Stack.Screen name="help" />
          <Stack.Screen name="restore" />
          {/* A preview page with nothing private on it: it opens without signing in. */}
          <Stack.Screen name="intro" />
          <Stack.Protected guard={signedIn} redirectTo="/sign-in">
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="account" />
            <Stack.Protected
              guard={hasCompletedOnboarding(profile)}
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
                "pro",
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
      <ProPaywall />
      {signedIn && hasCompletedOnboarding(profile) && <AppRatingListener />}
      <IntroHandoff />
    </>
  );
}
// Links analytics to the signed-in account's anonymous ID, and forgets it on
// sign-out. Guests and anonymous sessions stay unnamed.
function AnalyticsAccount() {
  useEffect(() => {
    // Starts analytics as the app opens, so app opens are counted too.
    startAnalytics();
    if (!backend) return;
    const name = (session: Session | null) => {
      const user = session?.user;
      return user && !user.is_anonymous ? user.id : null;
    };
    void backend.auth
      .getSession()
      .then(({ data }) => {
        const id = name(data.session);
        if (id) identifyAccount(id);
      })
      .catch(() => {});
    const { data } = backend.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") identifyAccount(null);
      else if (event === "SIGNED_IN") {
        const id = name(session);
        if (id) identifyAccount(id);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return null;
}

export default function Layout() {
  return (
    <AppProvider>
      <AnalyticsAccount />
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
