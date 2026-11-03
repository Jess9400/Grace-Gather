import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { Screen, Heading, Body, Field, Button, Notice } from "../components/ui";
import { useApp } from "../lib/state";
import { label } from "../lib/labels";
import { restoreEncrypted } from "../lib/storage";
export default function Restore() {
  const { profile, entries } = useApp();
  const [key, setKey] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function restore() {
    setBusy(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "application/octet-stream",
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      await restoreEncrypted(picked.assets[0].uri, key.trim());
      setNotice("Restored. Close and reopen Grace & Gather to load your journal.");
    } catch {
      setNotice(
        "Could not restore. Check the recovery key and backup file. Existing files have been preserved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen back>
      <Heading>{label(profile.language, "restore")}</Heading>
      <Body>{label(profile.language, "recovery")}</Body>
      {entries.length > 0 && (
        <Notice text="Restore requires an empty journal. Export your existing journal before deleting it." />
      )}
      <Field
        label="Recovery key"
        value={key}
        onChangeText={setKey}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Notice text={notice} />
      <Button
        disabled={
          busy || entries.length > 0 || !/^[a-f0-9]{64}$/i.test(key.trim())
        }
        title={label(profile.language, "restore")}
        onPress={() => void restore()}
      />
    </Screen>
  );
}
