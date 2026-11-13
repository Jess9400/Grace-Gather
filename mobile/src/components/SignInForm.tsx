import { useState } from "react";
import { Body, Button, Field, Notice } from "./quiet-ui";
import AppleSignIn from "./AppleSignIn";
import { useApp } from "../lib/state";
import { copy, type Language } from "../lib/content";
import { label } from "../lib/labels";
import { requireBackend } from "../lib/backend";
import { Platform } from "react-native";

// Signing in: an emailed code, or Apple where it is available. Used by the
// sign-in page, the Account section of Profile, onboarding and the journal.
export default function SignInForm({ language, chooseMethod = false }: { language?: Language; chooseMethod?: boolean }) {
  const { profile } = useApp(),
    lang = language ?? profile.language,
    l = (k: string) => label(lang, k);
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [nextSend, setNextSend] = useState(0),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [emailOpen, setEmailOpen] = useState(!chooseMethod || Platform.OS !== "ios" || process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED === "false");
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : copy(lang, "socialError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Notice text={notice} />
      {chooseMethod && <AppleSignIn onError={setNotice} />}
      {chooseMethod && !emailOpen && <Button secondary title={l("continueEmail")} onPress={() => setEmailOpen(true)} />}
      {emailOpen && <>
      <Field
        label={l("signInEmail")}
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
            if (Date.now() < nextSend) throw new Error(l("codeWait"));
            const { error } = await requireBackend().auth.signInWithOtp({
              email: email.trim(),
              options: { shouldCreateUser: true },
            });
            if (error) throw error;
            setSent(true);
            setNextSend(Date.now() + 60000);
          })
        }
      />
      {sent && (
        <>
          <Body small>{l("codeSent")}</Body>
          <Field
            label={l("code")}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            // Straight to the code once it is sent; the page scrolls the
            // field above the number pad.
            autoFocus
            maxLength={10}
          />
          <Button
            disabled={busy || code.length < 6}
            title={l("verify")}
            onPress={() =>
              void run(async () => {
                const { error } = await requireBackend().auth.verifyOtp({
                  email: email.trim(),
                  token: code.trim(),
                  type: "email",
                });
                if (error) throw error;
                setCode("");
              })
            }
          />
        </>
      )}
      </>}
      {!chooseMethod && <AppleSignIn onError={setNotice} />}
    </>
  );
}
