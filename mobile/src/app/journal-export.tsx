import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Button,
  Notice,
  Subheading,
  colors,
  switchColors,
} from "../components/quiet-ui";
import { TextAction } from "../components/CommunityControls";
import JournalDateField from "../components/JournalDateField";
import { useApp } from "../lib/state";
import { journalCopy } from "../lib/journal-library-copy";
import {
  selectJournalExport,
  validDateRange,
  journalExportHtml,
} from "../lib/journal-export";
import { resolveJournalResponse } from "../lib/journal-response";
import { exportEncrypted, releaseBackup } from "../lib/storage";
import { printJournal, shareJournalBackup } from "../lib/journal-files";
import type { Entry, Profile } from "../lib/content";
export default function JournalExport() {
  const { profile, journalItems } = useApp();
  const params = useLocalSearchParams<{
    entryId?: string;
    deletedChatId?: string;
    chat?: string;
  }>();
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [include, setInclude] = useState(params.chat === "1"),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [preparation, setPrepared] = useState<{
      source: Entry[];
      entries: Entry[];
      profile: Profile;
    }>(),
    [backupState, setBackup] = useState<{
      uri: string;
      key: string;
      source: Entry[];
      profile: Profile;
    }>(),
    [keySaved, setKeySaved] = useState(false);
  const backupRef = useRef<{ uri: string; key: string } | undefined>(undefined);
  const t = (key: Parameters<typeof journalCopy>[1]) =>
    journalCopy(profile.language, key);
  const valid = validDateRange(from, to);
  const selected = useMemo(
    () =>
      valid
        ? selectJournalExport(journalItems, {
            from,
            to,
            includeConversations: include,
            entryId: params.entryId,
            deletedChatId: params.deletedChatId,
          })
        : [],
    [
      journalItems,
      from,
      to,
      include,
      params.entryId,
      params.deletedChatId,
      valid,
    ],
  );
  useEffect(() => {
    let cancelled = false;
    if (backupRef.current) {
      releaseBackup(backupRef.current.uri);
      backupRef.current = undefined;
    }
    Promise.all(
      selected.map(async (entry) => ({
        ...entry,
        response: await resolveJournalResponse(entry, profile),
      })),
    )
      .then((entries) => {
        if (!cancelled) setPrepared({ source: selected, entries, profile });
      })
      .catch(() => {
        if (!cancelled)
          setNotice(journalCopy(profile.language, "exportFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [selected, profile]);
  useEffect(
    () => () => {
      if (backupRef.current) releaseBackup(backupRef.current.uri);
    },
    [],
  );
  const prepared =
    preparation?.source === selected && preparation.profile === profile
      ? preparation.entries
      : null;
  const backup =
    backupState?.source === selected && backupState.profile === profile
      ? backupState
      : undefined;
  const ready = !!prepared?.length && valid && !busy;
  async function makeBackup() {
    if (!ready) return;
    setBusy(true);
    setNotice("");
    try {
      if (backupRef.current) releaseBackup(backupRef.current.uri);
      const result = await exportEncrypted({ entries: prepared! });
      backupRef.current = result;
      setBackup({ ...result, source: selected, profile });
      setKeySaved(false);
    } catch {
      setNotice(t("exportFailed"));
    } finally {
      setBusy(false);
    }
  }
  // Prepared HTML lets the web print window open during the user's click, so
  // Safari does not block it after an asynchronous scripture lookup.
  const html = prepared ? journalExportHtml(prepared, profile.language) : "";
  return (
    <Screen back>
      <Heading>{t("exportTitle")}</Heading>
      <JournalDateField
        label={t("from")}
        value={from}
        language={profile.language}
        onChange={(value) => {
          setFrom(value);
          setNotice("");
          setKeySaved(false);
        }}
      />
      <JournalDateField
        label={t("to")}
        value={to}
        language={profile.language}
        onChange={(value) => {
          setTo(value);
          setNotice("");
          setKeySaved(false);
        }}
      />
      <Body small>{t("allDates")}</Body>
      {!valid && <Notice text={t("badDates")} />}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
        <View style={{ flex: 1 }}>
          <Body>{t("includeChat")}</Body>
        </View>
        <Switch
          {...switchColors}
          accessibilityLabel={t("includeChat")}
          value={include}
          onValueChange={(value) => {
            setInclude(value);
            setNotice("");
            setKeySaved(false);
          }}
        />
      </View>
      <Body small>
        {t("selection")}: {selected.length}
      </Body>
      <Notice text={notice} />
      <Card>
        <Subheading>{t("pdf")}</Subheading>
        <Body small>{t("pdfInfo")}</Body>
        <Button
          secondary
          disabled={!ready}
          title={busy ? t("working") : t("pdf")}
          onPress={() => {
            setBusy(true);
            setNotice("");
            void printJournal(html)
              .then(() =>
                setNotice(Platform.OS === "web" ? t("pdfReady") : t("saved")),
              )
              .catch(() => setNotice(t("exportFailed")))
              .finally(() => setBusy(false));
          }}
        />
      </Card>
      <Card>
        <Subheading>{t("backup")}</Subheading>
        <Body small>{t("backupInfo")}</Body>
        <Button
          secondary
          disabled={!ready}
          title={busy ? t("working") : t("backup")}
          onPress={() => void makeBackup()}
        />
        {backup && (
          <>
            <Body small>{t("recoveryKey")}</Body>
            <Text
              selectable
              style={{ color: colors.ink, fontSize: 14, lineHeight: 24 }}
            >
              {backup.key}
            </Text>
            <View
              style={{ flexDirection: "row", gap: 16, alignItems: "center" }}
            >
              <View style={{ flex: 1 }}>
                <Body small>{t("savedKey")}</Body>
              </View>
              <Switch
                {...switchColors}
                accessibilityLabel={t("savedKey")}
                value={keySaved}
                onValueChange={setKeySaved}
              />
            </View>
            <Button
              disabled={!keySaved || busy}
              title={t("saveBackup")}
              onPress={() => {
                setBusy(true);
                void shareJournalBackup(backup.uri)
                  .catch(() => setNotice(t("exportFailed")))
                  .finally(() => setBusy(false));
              }}
            />
          </>
        )}
      </Card>
      <TextAction
        title={t("restoreBackup")}
        onPress={() => router.push("/restore")}
      />
    </Screen>
  );
}
