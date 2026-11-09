import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import {
  Screen,
  Heading,
  Body,
  Field,
  Button,
  Notice,
} from "../components/quiet-ui";
import { useApp } from "../lib/state";
import { journalCopy } from "../lib/journal-library-copy";
import { restoreEncrypted } from "../lib/storage";
export default function Restore() {
  const { profile, reloadJournal } = useApp();
  const [key, setKey] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const t = (name: Parameters<typeof journalCopy>[1]) =>
    journalCopy(profile.language, name);
  async function restore() {
    setBusy(true);
    setNotice("");
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      await restoreEncrypted(picked.assets[0].uri, key.trim());
      await reloadJournal();
      setKey("");
      setNotice(t("restored"));
    } catch {
      setNotice(t("restoreFailed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen back>
      <Heading>{t("restoreBackup")}</Heading>
      <Body>{t("restoreInfo")}</Body>
      <Field
        label={t("recoveryKey")}
        value={key}
        onChangeText={setKey}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Notice text={notice} />
      <Button
        disabled={busy || !/^[a-f0-9]{64}$/i.test(key.trim())}
        title={t("restoreBackup")}
        onPress={() => void restore()}
      />
    </Screen>
  );
}
