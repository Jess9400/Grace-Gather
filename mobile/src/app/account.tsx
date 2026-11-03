import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Button,
  Field,
  Notice,
  External,
} from "../components/ui";
import { TextAction } from "../components/QuietControls";
import { designCopy } from "../lib/design-copy";
import { confessionAPI } from "../lib/confession";
import EmailSignIn from "../components/EmailSignIn";
import { useApp } from "../lib/state";
import { copy } from "../lib/content";
import { label } from "../lib/labels";
import { backend, requireUser, requireBackend } from "../lib/backend";
import * as storage from "../lib/storage";
import {
  enableReminder,
  disableGatheringPush,
  disableReminder,
  remindersEnabled,
  registerGatheringPush,
} from "../lib/notifications";
export default function Account() {
  const { profile, reset } = useApp(),
    t = (k: string) => copy(profile.language, k),
    l = (k: string) => label(profile.language, k);
  const [moderator, setModerator] = useState<{
    email: string;
    enabled: boolean;
  } | null>(null);
  const [userEmail, setUserEmail] = useState(""),
    [signedIn, setSignedIn] = useState(false),
    [authReady, setAuthReady] = useState(!backend),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [reminder, setReminder] = useState(false),
    [confirmation, setConfirmation] = useState(""),
    [deleting, setDeleting] = useState<"account" | "local" | null>(null),
    [backup, setBackup] = useState<{ key: string; uri: string } | null>(null);
  useEffect(() => {
    let active = true,
      authChanged = false;
    void remindersEnabled()
      .then(setReminder)
      .catch(() => {});
    void backend?.auth
      .getSession()
      .then(({ data }) => {
        if (!active || authChanged) return;
        setSignedIn(!!data.session);
        setUserEmail(data.session?.user.email ?? "");
        setAuthReady(true);
      })
      .catch(() => {
        if (active) setAuthReady(true);
      });
    const listener = backend?.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      if (!active) return;
      setSignedIn(!!session);
      setUserEmail(session?.user.email ?? "");
      setAuthReady(true);
    });
    return () => {
      active = false;
      listener?.data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (signedIn)
      void confessionAPI("status")
        .then((result) => {
          if (active)
            setModerator({ email: userEmail, enabled: !!result.moderator });
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [signedIn, userEmail]);
  async function run(fn: () => Promise<void>, failure = "accountError") {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      const key = e instanceof Error ? e.message : "";
      setNotice(
        l(
          [
            "notificationsDenied",
            "pushUnavailable",
            "signInRequired",
            "deleteFailed",
          ].includes(key)
            ? key
            : failure,
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function sync() {
    const { client, user } = await requireUser();
    const { error } = await client.from("profiles").upsert({
      id: user.id,
      name: profile.name,
      city: profile.city,
      region: profile.region,
      country: profile.country,
      language: profile.language,
      tradition: profile.tradition,
      scripture_language: profile.scriptureLanguage,
      edition: profile.edition,
      intent: profile.intent,
      notification_email: profile.emailConsent ? profile.email : "",
      email_consent: profile.emailConsent,
      consent_at: profile.emailConsent ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    setNotice(l("synced"));
  }
  return (
    <Screen back>
      <Heading>{l("account")}</Heading>
      <Notice text={notice} />
      <Button
        secondary
        title={t("pEditProfile")}
        onPress={() => router.push("/onboarding")}
      />
      <Button
        secondary
        title={l("privacy")}
        onPress={() => router.push("/privacy")}
      />
      <Card>
        <Subheading>{signedIn ? l("welcomeBack") : l("signIn")}</Subheading>
        <Body small>{l("optionalAccount")}</Body>
        {!authReady ? (
          <Body small>{l("authChecking")}</Body>
        ) : !backend ? (
          <Notice text={l("unconnected")} />
        ) : signedIn ? (
          <>
            <Body>{userEmail}</Body>
            <Button
              disabled={busy}
              title={l("sync")}
              onPress={() => void run(sync)}
            />
            <Button
              secondary
              disabled={busy}
              title={l("signOut")}
              onPress={() =>
                void run(async () => {
                  await disableGatheringPush();
                  const result = await requireBackend().auth.signOut();
                  if (result.error) throw result.error;
                })
              }
            />
          </>
        ) : (
          <EmailSignIn />
        )}
      </Card>
      {Platform.OS !== "web" && (
        <Card>
          <Subheading>{l("reminder")}</Subheading>
          <Button
            secondary
            disabled={busy}
            title={l(reminder ? "reminderOff" : "reminderOn")}
            onPress={() =>
              void run(async () => {
                if (reminder) await disableReminder();
                else await enableReminder(profile.language);
                setReminder(!reminder);
              })
            }
          />
          {signedIn && (
            <Button
              secondary
              disabled={busy}
              title={l("pushEnable")}
              onPress={() =>
                void run(async () => {
                  await registerGatheringPush();
                  setNotice(t("saved"));
                })
              }
            />
          )}
        </Card>
      )}
      {Platform.OS !== "web" && (
        <Card>
          <Subheading>{t("privacyTitle")}</Subheading>
          <Body small>{l("device")}</Body>
          <Button
            secondary
            disabled={busy}
            title={l("backup")}
            onPress={() =>
              void run(
                async () => setBackup(await storage.exportEncrypted()),
                "backupError",
              )
            }
          />
          {backup && (
            <>
              <Body>{l("recovery")}</Body>
              <Body>{backup.key}</Body>
              <Button
                title={l("shareFile")}
                onPress={() =>
                  void run(async () => {
                    await Sharing.shareAsync(backup.uri, {
                      mimeType: "application/octet-stream",
                      dialogTitle: l("backupTitle"),
                    });
                  })
                }
              />
            </>
          )}
          <Button
            secondary
            title={l("restore")}
            onPress={() => router.push("/restore")}
          />
        </Card>
      )}
      <Card>
        {signedIn && (
          <Button
            secondary
            title={l("deleteAccount")}
            onPress={() => {
              setDeleting("account");
              setConfirmation("");
            }}
          />
        )}
        <Button
          secondary
          title={l("deleteLocal")}
          onPress={() => {
            setDeleting("local");
            setConfirmation("");
          }}
        />
        {deleting && (
          <>
            <Body>
              {l(deleting === "account" ? "deleteWarning" : "localDelete")}
            </Body>
            <Field
              label={l("confirmDelete")}
              value={confirmation}
              onChangeText={setConfirmation}
            />
            <Button
              disabled={confirmation !== "DELETE" || busy}
              title={l(
                deleting === "account" ? "deleteAccount" : "deleteLocal",
              )}
              onPress={() =>
                void run(async () => {
                  if (deleting === "account") {
                    const { client } = await requireUser();
                    const { data, error } = await client.functions.invoke(
                      "account-delete",
                      { body: { confirm: "DELETE" } },
                    );
                    if (error || !data?.deleted)
                      throw new Error("deleteFailed");
                    await client.auth.signOut({ scope: "local" });
                    setSignedIn(false);
                    if (data.appleRevokeRequired) setNotice(l("appleRemove"));
                    else setNotice(l("accountDeleted"));
                  } else {
                    await disableReminder();
                    await disableGatheringPush();
                    await backend?.auth.signOut({ scope: "local" });
                    await reset();
                    router.replace("/onboarding");
                  }
                  setDeleting(null);
                })
              }
            />
            <Button
              secondary
              title={t("cancel")}
              onPress={() => setDeleting(null)}
            />
          </>
        )}
      </Card>
      {signedIn && moderator?.email === userEmail && moderator.enabled && (
        <Card>
          <Subheading>
            {designCopy(profile.language, "communityTools")}
          </Subheading>
          <TextAction
            title={t("cReview")}
            icon="shield-checkmark-outline"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/confession",
                params: { view: "review" },
              })
            }
          />
        </Card>
      )}
      <External
        title="hello@graceandgather.com"
        url="mailto:hello@graceandgather.com"
      />
    </Screen>
  );
}
