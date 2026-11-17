import { useState } from "react";
import { Body, Button, Field, Notice, colors } from "./quiet-ui";
import AppleSignIn from "./AppleSignIn";
import { useApp } from "../lib/state";
import type { Language } from "../lib/content";
import { label } from "../lib/labels";
import { requireBackend } from "../lib/backend";
import { Platform, Pressable, Text, View } from "react-native";

// Signing in: an emailed code, or Apple where it is available. Used by the
// sign-in page, the Account section of Profile, onboarding and the journal.
export default function SignInForm({ language, chooseMethod = false }: { language?: Language; chooseMethod?: boolean }) {
  const { profile } = useApp(),
    lang = language ?? profile.language,
    l = (k: string) => label(lang, k);
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [password, setPassword] = useState(""),
    [passwordMode, setPasswordMode] = useState(false),
    [sent, setSent] = useState(false),
    [nextSend, setNextSend] = useState(0),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [method, setMethod] = useState<"apple" | "email">(
      chooseMethod && Platform.OS === "ios" && process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED !== "false" ? "apple" : "email",
    );
  const appleAvailable = Platform.OS === "ios" && process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED !== "false";
  async function run(fn: () => Promise<void>, step: "send" | "verify" | "password") {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(authNotice(e, step, l));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Notice text={notice} />
      {chooseMethod && appleAvailable && <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: colors.white, borderRadius: 14, padding: 4, gap: 4 }}>
        {([ ["apple", "Apple"], ["email", l("signInEmail")] ] as const).map(([value, title]) => <Pressable
          key={value} accessibilityRole="tab" accessibilityState={{ selected: method === value }}
          onPress={() => setMethod(value)}
          style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: method === value ? colors.green : "transparent" }}>
          <Text style={{ color: method === value ? colors.paper : colors.ink, fontSize: 15, fontWeight: "600" }}>{title}</Text>
        </Pressable>)}
      </View>}
      {chooseMethod && method === "apple" && <AppleSignIn onError={setNotice} />}
      {method === "email" && <>
      <Field
        label={l("signInEmail")}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      {passwordMode ? <>
        <Field
          label={l("password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
        />
        <Button
          disabled={busy || !email.includes("@") || !password}
          title={l("signIn")}
          onPress={() => void run(async () => {
            const { error } = await requireBackend().auth.signInWithPassword({ email: email.trim(), password });
            if (error) throw error;
            setPassword("");
          }, "password")}
        />
      </> : <>
      <Button
        disabled={busy || !email.includes("@")}
        title={l("sendCode")}
        onPress={() =>
          void run(async () => {
            if (Date.now() < nextSend) throw new Error("codeWait");
            const { error } = await requireBackend().auth.signInWithOtp({
              email: email.trim(),
              options: { shouldCreateUser: true },
            });
            if (error) throw error;
            setSent(true);
            setNextSend(Date.now() + 60000);
          }, "send")
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
              }, "verify")
            }
          />
        </>
      )}
      </>}
      {chooseMethod && <Pressable
        accessibilityRole="button"
        onPress={() => { setPasswordMode((value) => !value); setPassword(""); setNotice(""); }}
        style={{ alignSelf: "center", padding: 12 }}>
        <Text style={{ color: colors.ink, textDecorationLine: "underline", fontSize: 14 }}>
          {l(passwordMode ? "signInWithCode" : "signInWithPassword")}
        </Text>
      </Pressable>}
      </>}
      {!chooseMethod && <AppleSignIn onError={setNotice} />}
    </>
  );
}

// Sign-in errors come from the server in English. Show our own words, in the
// person's language, for the cases people meet.
function authNotice(e: unknown, step: "send" | "verify" | "password", l: (k: string) => string) {
  const err = (e ?? {}) as { status?: number; code?: string; message?: string };
  if (err.message === "codeWait") return l("codeWait");
  const text = `${err.code ?? ""} ${err.message ?? ""}`.toLowerCase();
  if (err.status === 429 || /rate.?limit|security purposes|too many/.test(text))
    return l("authRateLimit");
  if (/network|failed to fetch|timeout|timed out/.test(text))
    return l("authNetworkError");
  if (step === "password") return l("authPasswordError");
  if (step === "verify" && /expired|invalid|otp|token/.test(text))
    return l("authInvalidCode");
  return l(step === "send" ? "authSendError" : "authVerifyError");
}
