import { Platform, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import IntroWalk from "../components/IntroWalk";
import { useApp } from "../lib/state";
import { isOrthodox, isProtestant } from "../lib/church-calendar";
import {
  introCopy,
  type IntroChurch,
  type IntroLanguage,
} from "../lib/intro-walk";

const churches: IntroChurch[] = ["catholic", "orthodox", "protestant"];

// A preview of the first-visit intro, for the web only. Nothing in the app
// links here and it is not part of anyone's first visit yet: open /intro to
// watch it, signed in or not. ?church=orthodox and ?lang=ru show the other
// versions. Opening the door goes to the church, which asks a signed-out
// visitor to sign in.
export default function Intro() {
  const { profile } = useApp();
  const asked = useLocalSearchParams<{ church?: string; lang?: string }>();
  if (Platform.OS !== "web") return <Redirect href="/(tabs)" />;
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
        onDone={() => router.replace("/(tabs)")}
      />
    </View>
  );
}
