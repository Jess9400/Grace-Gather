import { useState } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Screen, Heading, Body, Field, Button, Notice } from "../components/ui";
import { useApp } from "../lib/state";
import { label } from "../lib/labels";
import { restoreEncrypted } from "../lib/storage";
export default function Restore() {
  const { profile, entries, reloadJournal } = useApp();
  const l = (key: string) => label(profile.language, key);
  const [key, setKey] = useState(""),
    [status, setStatus] = useState<"" | "done" | "error">(""),
    [busy, setBusy] = useState(false);
  async function restore() {
    setBusy(true);
    setStatus("");
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "application/octet-stream",
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      await restoreEncrypted(picked.assets[0].uri, key.trim());
      await reloadJournal();
      setKey("");
      setStatus("done");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }
  if (Platform.OS === "web")
    return (
      <Screen back>
        <Heading>{l("restore")}</Heading>
        <Body>{l("restoreNative")}</Body>
      </Screen>
    );
  return (
    <Screen back>
      <Heading>{label(profile.language, "restore")}</Heading>
      <Body>{label(profile.language, "recovery")}</Body>
      {entries.length > 0 && status !== "done" && (
        <Notice text={l("restoreEmpty")} />
      )}
      <Field
        label={l("recoveryKey")}
        value={key}
        onChangeText={setKey}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Notice
        text={
          status ? l(status === "done" ? "restoreDone" : "restoreError") : ""
        }
      />
      {status === "done" ? (
        <Button
          title={l("journalOpen")}
          onPress={() => router.replace("/(tabs)")}
        />
      ) : (
        <Button
          disabled={
            busy || entries.length > 0 || !/^[a-f0-9]{64}$/i.test(key.trim())
          }
          title={label(profile.language, "restore")}
          onPress={() => void restore()}
        />
      )}
    </Screen>
  );
}
