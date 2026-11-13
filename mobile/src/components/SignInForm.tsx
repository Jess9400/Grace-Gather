import { useState } from "react";
import { Body, Button, Field, Notice, colors } from "./quiet-ui";
import AppleSignIn from "./AppleSignIn";
import { useApp } from "../lib/state";
import { copy, type Language } from "../lib/content";
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
    [sent, setSent] = useState(false),
    [nextSend, setNextSend] = useState(0),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [method, setMethod] = useState<"apple" | "email">(
      chooseMethod && Platform.OS === "ios" && process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED !== "false" ? "apple" : "email",
    );
  const appleAvailable = Platform.OS === "ios" && process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED !== "false";
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
