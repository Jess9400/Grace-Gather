import { useState } from "react";
import { Body, Button, Field, Notice } from "./quiet-ui";
import AppleSignIn from "./AppleSignIn";
import { useApp } from "../lib/state";
import { copy } from "../lib/content";
import { label } from "../lib/labels";
import { requireBackend } from "../lib/backend";

// Signing in: an emailed code, or Apple where it is available. Used by the
// sign-in page and by the Account section of Profile.
export default function SignInForm() {
  const { profile } = useApp(),
    l = (k: string) => label(profile.language, k);
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [nextSend, setNextSend] = useState(0),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : copy(profile.language, "socialError"),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Notice text={notice} />
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
      <AppleSignIn onError={setNotice} />
    </>
  );
}
