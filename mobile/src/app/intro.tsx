import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import IntroWalk from "../components/IntroWalk";
import { useApp } from "../lib/state";
import { isOrthodox, isProtestant } from "../lib/church-calendar";
import { markIntroSeen } from "../lib/intro-seen";
import { showEntranceAgain, requestFirstChurchTour } from "../lib/church-entrance";
import { useSignedIn } from "../lib/account";
import { hasCompletedOnboarding } from "../lib/onboarding";
import { beginIntroHandoff } from "../lib/intro-handoff";
import {
  introCopy,
  type IntroChurch,
  type IntroLanguage,
} from "../lib/intro-walk";
import { track } from "../lib/analytics";

const churches: IntroChurch[] = ["catholic", "orthodox", "protestant"];

// The first-visit intro, shown once to each new account on the way into the
// church after onboarding (the tabs send people here), in the person's own
// language and with their own church, on phones and on the web alike. It can
// also be opened directly at /intro, signed in or not; ?church=orthodox and
// ?lang=ru show the other versions. Opening the door (or skipping) leads to
// the church's own doors, which the person opens to go in.
export default function Intro() {
  const { profile } = useApp();
  const signedIn = useSignedIn();
  const asked = useLocalSearchParams<{ church?: string; lang?: string }>();
  const church =
    churches.find((name) => name === asked.church) ??
    (isOrthodox(profile)
      ? "orthodox"
      : isProtestant(profile)
        ? "protestant"
        : "catholic");
  const language: IntroLanguage =
    asked.lang && asked.lang in introCopy
      ? (asked.lang as IntroLanguage)
      : profile.language;
  return (
    <View style={{ flex: 1, backgroundColor: "#05060C" }}>
      <IntroWalk
        language={language}
        church={church}
        onDone={(moment) => {
          // Remembered first, so the church does not send them back here.
          markIntroSeen();
          showEntranceAgain();
          requestFirstChurchTour();
          track("intro_finished", { skipped: moment === undefined });
          if (
            signedIn &&
            hasCompletedOnboarding(profile) &&
            moment !== undefined
          ) {
            beginIntroHandoff({ church, language, moment });
          }
          router.replace("/(tabs)");
        }}
      />
    </View>
  );
}
