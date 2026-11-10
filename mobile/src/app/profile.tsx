import { avatarColor, initial } from "../lib/people-theme";
import { q } from "../lib/quiet-copy";
import Disclosure from "../components/Disclosure";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
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
  colors,
  serif,
} from "../components/quiet-ui";
import SignInForm from "../components/SignInForm";
import { useQuiet } from "../lib/quiet-state";
import { useApp } from "../lib/state";
import { copy, editionsFor, languages } from "../lib/content";
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
  const [userEmail, setUserEmail] = useState(""),
    [signedIn, setSignedIn] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [reminder, setReminder] = useState(false),
    [confirmation, setConfirmation] = useState(""),
    [deleting, setDeleting] = useState<"account" | "local" | null>(null),
    [backup, setBackup] = useState<{ key: string; uri: string } | null>(null);
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
  // What the person told us when they first arrived, and nothing else.
  const place = [profile.city, profile.region].filter(Boolean).join(", ");
  const faith = profile.faithChoice;
  const facts: [string, string][] = [
    [
      tr("Tradition"),
      faith === "catholic" || faith === "protestant" || faith === "orthodox"
        ? t(faith)
        : faith === "exploring"
          ? q(profile.language, "exploring")
          : "",
    ],
    [tr("Your language"), languages[profile.language]],
    [
      tr("Your Bible"),
      editionsFor(profile).find((e) => e.id === profile.edition)?.name ?? "",
    ],
    [tr("Location"), place],
    ...(profile.email
      ? [[t("pEmail"), profile.email] as [string, string]]
      : []),
  ];
  return (
    <Screen back>
      <Heading>{tr("Profile")}</Heading>
      <Notice text={notice} />
      <Card>
        <View style={s.who}>
          <View
            accessible={false}
            style={[
              s.avatar,
              { backgroundColor: avatarColor(profile.name || "·") },
            ]}
          >
            <Text style={s.initial}>{initial(profile.name)}</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.name}>{profile.name.trim() || tr("Friend")}</Text>
            {!!place && <Text style={s.place}>{place}</Text>}
          </View>
        </View>
        <View style={s.facts}>
          {facts.map(([title, value]) => (
            <View key={title} style={s.fact}>
              <Text style={s.factTitle}>{title}</Text>
              <Text style={s.factValue}>{value || tr("Not added yet")}</Text>
            </View>
          ))}
        </View>
        <Button
          secondary
          title={tr("Edit")}
          onPress={() => router.push("/preferences")}
        />
      </Card>
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
            <SignInForm />
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
const s = StyleSheet.create({
  who: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { fontFamily: serif, fontSize: 24, color: colors.ink },
  name: { fontFamily: serif, fontSize: 24, lineHeight: 30, color: colors.ink },
  place: { fontSize: 14, lineHeight: 20, color: colors.cardMuted },
  facts: { borderTopWidth: 1, borderTopColor: colors.line },
  fact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  factTitle: { fontSize: 14, lineHeight: 20, color: colors.cardMuted },
  factValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
  },
});
