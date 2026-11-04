import { router } from "expo-router";
import { Screen, Heading, Button } from "../../components/quiet-ui";
import { useApp } from "../../lib/state";
import { copy } from "../../lib/content";
import { q } from "../../lib/quiet-copy";
export default function More() {
  const { profile } = useApp(),
    lang = profile.language;
  return (
    <Screen>
      <Heading>{q(lang, "more")}</Heading>
      <Button
        secondary
        title="Community"
        onPress={() => router.push("/community")}
      />
      <Button
        secondary
        title={copy(lang, "explore")}
        onPress={() => router.push("/(tabs)/explore")}
      />
      <Button
        secondary
        title={q(lang, "library")}
        onPress={() => router.push("/library")}
      />
      <Button
        secondary
        title={copy(lang, "gather")}
        onPress={() => router.push("/(tabs)/gatherings")}
      />
      <Button
        secondary
        title={copy(lang, "confession")}
        onPress={() => router.push("/(tabs)/confession")}
      />
      <Button
        secondary
        title={copy(lang, "history")}
        onPress={() => router.push("/history")}
      />
      <Button
        secondary
        title={q(lang, "tradition")}
        onPress={() => router.push("/onboarding")}
      />
      <Button
        secondary
        title={copy(lang, "settings")}
        onPress={() => router.push("/account")}
      />
    </Screen>
  );
}
