import { friendCopy } from "../lib/friends-copy";
import { AccountMenuRow } from "../components/AccountMenuContent";
import Disclosure from "../components/Disclosure";
import { useInterfaceCopy } from "../lib/use-interface-copy";
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
} from "../components/quiet-ui";
import AppleSignIn from "../components/AppleSignIn";
import { useQuiet } from "../lib/quiet-state";
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
export default function Profile() {
  const tr = useInterfaceCopy();
  const { clear } = useQuiet();
  const { profile, reset } = useApp(),
    t = (k: string) => copy(profile.language, k),
    l = (k: string) => label(profile.language, k);
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [userEmail, setUserEmail] = useState(""),
    [signedIn, setSignedIn] = useState(false),
    [sent, setSent] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [reminder, setReminder] = useState(false),
    [confirmation, setConfirmation] = useState(""),
    [deleting, setDeleting] = useState<"account" | "local" | null>(null),
    [backup, setBackup] = useState<{ key: string; uri: string } | null>(null),
    [nextSend, setNextSend] = useState(0);
  useEffect(() => {
    void remindersEnabled().then(setReminder);
    void backend?.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setUserEmail(data.session?.user.email ?? "");
    });
    const listener = backend?.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
      setUserEmail(session?.user.email ?? "");
    });
    return () => listener?.data.subscription.unsubscribe();
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : t("socialError"));
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
      <Heading>{tr("Profile")}</Heading>
      <Notice text={notice} />
      <AccountMenuRow
        title={tr("Edit profile and preferences")}
        route="/preferences"
        icon="create-outline"
      />
      <AccountMenuRow
        title={tr("My testimonies")}
        route="/testimonies"
        icon="chatbubble-outline"
      />
      <AccountMenuRow
        title={tr("Pay it forward")}
        route="/giving"
        icon="heart-outline"
      />
      <AccountMenuRow
        title={tr("My calendar")}
        route="/my-calendar"
        icon="calendar-outline"
      />
      <AccountMenuRow
        title={friendCopy(profile.language, "Friends & chats")}
        route="/friends"
        icon="people-outline"
      />
      <Disclosure title={l("account")} initiallyOpen={!signedIn}>
        <Card>
          <Subheading>{signedIn ? l("welcomeBack") : l("signIn")}</Subheading>
          <Body small>{l("optionalAccount")}</Body>
          {!backend ? (
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
            <>
              <Field
                label={t("pEmail")}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Button
                disabled={busy || !email.includes("@")}
                title={l("sendCode")}
                onPress={() =>
                  void run(async () => {
                    if (Date.now() < nextSend)
                      throw new Error(
                        "Please wait a minute before requesting another code.",
                      );
                    const { error } = await requireBackend().auth.signInWithOtp(
                      {
                        email: email.trim(),
                        options: { shouldCreateUser: true },
                      },
                    );
                    if (error) throw error;
                    setSent(true);
                    setNextSend(Date.now() + 60000);
                  })
                }
              />
              {sent && (
                <>
                  <Field
                    label={l("code")}
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    maxLength={10}
                  />
                  <Button
                    disabled={busy || code.length < 6}
                    title={l("verify")}
                    onPress={() =>
                      void run(async () => {
                        const { error } = await requireBackend().auth.verifyOtp(
                          {
                            email: email.trim(),
                            token: code.trim(),
                            type: "email",
                          },
                        );
                        if (error) throw error;
                        setCode("");
                      })
                    }
                  />
                </>
              )}
              <AppleSignIn onError={setNotice} />
            </>
          )}
        </Card>
      </Disclosure>
      {Platform.OS !== "web" && (
        <Card>
          <Subheading>{l("reminder")}</Subheading>
          <Button
            secondary
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
              title={t("gather")}
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
              void run(async () => setBackup(await storage.exportEncrypted()))
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
                      dialogTitle: "Grace & Gather encrypted backup",
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
      <Disclosure title={tr("Delete data or account")}>
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
                        throw new Error(
                          "Account deletion did not complete. Please retry or contact support.",
                        );
                      await client.auth.signOut({ scope: "local" });
                      setSignedIn(false);
                      if (data.appleRevokeRequired)
                        setNotice(
                          tr(
                            "Your account has been deleted. Remove Grace & Gather under Sign in with Apple in your Apple Account settings.",
                          ),
                        );
                    } else {
                      await disableReminder();
                      await disableGatheringPush();
                      await backend?.auth.signOut({ scope: "local" });
                      await reset();
                      clear();
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
      </Disclosure>
      <Disclosure title={tr("Privacy and support")}>
        <Button
          secondary
          title={l("privacy")}
          onPress={() => router.push("/privacy")}
        />
        <External
          title="hello@graceandgather.com"
          url="mailto:hello@graceandgather.com"
        />
      </Disclosure>
    </Screen>
  );
}
