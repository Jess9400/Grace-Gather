import { useEffect, useRef, useState } from "react";
import { Body, Button, Field, Notice } from "./ui";
import AppleSignIn from "./AppleSignIn";
import { requireBackend } from "../lib/backend";
import { useApp } from "../lib/state";
import { label } from "../lib/labels";
import * as storage from "../lib/storage";
import {
  authErrorKey,
  normalizeCode,
  normalizeEmail,
  resendSeconds,
  suggestedEmail,
  validCode,
  validEmail,
} from "../lib/auth-flow";

export default function EmailSignIn() {
  const { profile } = useApp();
  const l = (key: string, values: Record<string, string | number> = {}) =>
    Object.entries(values).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, String(value)),
      label(profile.language, key),
    );
  const [email, setEmail] = useState(profile.email || "");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [nextSend, setNextSend] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const inFlight = useRef(false);
  const emailEdited = useRef(false);
  const rememberQueue = useRef(Promise.resolve());
  const suggestion = suggestedEmail(email);

  useEffect(() => {
    let active = true;
    void storage
      .getItem("auth-email")
      .then((saved) => {
        if (active && !emailEdited.current && saved && validEmail(saved))
          setEmail(saved);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function rememberEmail(value: string) {
    rememberQueue.current = rememberQueue.current
      .catch(() => {})
      .then(async () => {
        if (validEmail(value))
          await storage.setItem("auth-email", normalizeEmail(value));
        else if (!value.trim()) await storage.removeItem("auth-email");
      });
    await rememberQueue.current;
  }

  useEffect(() => {
    const update = () => setSeconds(resendSeconds(nextSend));
    update();
    if (!resendSeconds(nextSend)) return;
    const timer = setInterval(() => {
      update();
      if (!resendSeconds(nextSend)) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [nextSend]);

  async function send() {
    if (inFlight.current || resendSeconds(nextSend)) return;
    const destination = sentTo || normalizeEmail(email);
    if (!validEmail(destination)) {
      setNotice(l("authInvalidEmail"));
      return;
    }
    inFlight.current = true;
    setBusy("send");
    setNotice("");
    try {
      await rememberEmail(destination);
      const { error } = await requireBackend().auth.signInWithOtp({
        email: destination,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setSentTo(destination);
      setCode("");
      setNextSend(Date.now() + 60000);
    } catch (error) {
      const key = authErrorKey(error, "send");
      if (key === "authRateLimit") setNextSend(Date.now() + 60000);
      setNotice(l(key));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }
  async function verify() {
    if (inFlight.current || !sentTo || !validCode(code)) return;
    inFlight.current = true;
    setBusy("verify");
    setNotice("");
    try {
      // Bind verification to the address that received this code, even if the
      // next email input later changes. Never persist the one-time code.
      const { error } = await requireBackend().auth.verifyOtp({
        email: sentTo,
        token: normalizeCode(code),
        type: "email",
      });
      if (error) throw error;
      setCode("");
    } catch (error) {
      setNotice(l(authErrorKey(error, "verify")));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }
  return (
    <>
      <Notice text={notice} />
      {!sentTo ? (
        <>
          <Field
            label={l("authEmail")}
            value={email}
            editable={!busy}
            onChangeText={(value) => {
              emailEdited.current = true;
              setEmail(value);
              setNotice("");
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            onBlur={() =>
              void rememberEmail(email).catch(() =>
                setNotice(l("authRememberError")),
              )
            }
            onSubmitEditing={() => void send()}
          />
          {!!suggestion && (
            <>
              <Body small>{l("authSuggestion", { email: suggestion })}</Body>
              <Button
                secondary
                disabled={!!busy}
                title={l("authUseEmail", { email: suggestion })}
                onPress={() => {
                  emailEdited.current = true;
                  setEmail(suggestion);
                  void rememberEmail(suggestion).catch(() =>
                    setNotice(l("authRememberError")),
                  );
                  setNotice("");
                }}
              />
            </>
          )}
        </>
      ) : (
        <>
          <Body>{l("authSent", { email: sentTo })}</Body>
          <Field
            label={l("code")}
            value={code}
            editable={!busy}
            onChangeText={(value) => setCode(normalizeCode(value))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            autoCorrect={false}
            maxLength={10}
            onSubmitEditing={() => void verify()}
          />
          <Button
            disabled={!!busy || !validCode(code)}
            title={l(busy === "verify" ? "authVerifying" : "verify")}
            onPress={() => void verify()}
          />
        </>
      )}
      <Button
        secondary={!!sentTo}
        disabled={!!busy || seconds > 0 || (!sentTo && !validEmail(email))}
        title={
          busy === "send"
            ? l("authSending")
            : seconds > 0
              ? l("authCountdown", { seconds })
              : l(sentTo ? "authResend" : "sendCode")
        }
        onPress={() => void send()}
      />
      {!!sentTo && (
        <Button
          secondary
          disabled={!!busy}
          title={l("authChangeEmail")}
          onPress={() => {
            setSentTo("");
            setCode("");
            setNotice("");
          }}
        />
      )}
      <AppleSignIn onError={setNotice} />
    </>
  );
}
