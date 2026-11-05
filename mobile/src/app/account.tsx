import { router } from "expo-router";
import { Screen, Heading, Button } from "../components/quiet-ui";
import { useInterfaceCopy } from "../lib/use-interface-copy";
export default function AccountMenu() {
  const tr = useInterfaceCopy();
  return (
    <Screen back>
      <Heading>{tr("Your space")}</Heading>
      <Button
        secondary
        title={tr("Profile")}
        onPress={() => router.push("/profile")}
      />
      <Button
        secondary
        title={tr("My Journal")}
        onPress={() => router.push("/history")}
      />
      <Button
        secondary
        title={tr("Community")}
        onPress={() => router.push("/community")}
      />
    </Screen>
  );
}
