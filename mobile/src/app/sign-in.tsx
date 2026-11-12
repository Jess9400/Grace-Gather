import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Screen, Heading, Body, Button, Notice } from "../components/quiet-ui";
import SignInForm from "../components/SignInForm";
import { useApp } from "../lib/state";
import { label } from "../lib/labels";
import { backend } from "../lib/backend";
import { isMemberSession } from "../lib/account";

// One clear place to sign in. Every "Sign in" button leads here, and signing
// in returns the person to the screen they came from.
export default function SignIn() {
  const { profile } = useApp(),
    l = (k: string) => label(profile.language, k);
  const [signedIn, setSignedIn] = useState<boolean | null>(null),
    [email, setEmail] = useState("");
  const wasSignedOut = useRef(false);
  useEffect(() => {
    void backend?.auth.getSession().then(({ data }) => {
      wasSignedOut.current = !isMemberSession(data.session);
      setSignedIn(isMemberSession(data.session));
      setEmail(data.session?.user.email ?? "");
    });
    const listener = backend?.auth.onAuthStateChange((_event, session) => {
      setSignedIn(isMemberSession(session));
      setEmail(session?.user.email ?? "");
      // Just signed in here: go straight back to what they were doing.
      if (isMemberSession(session) && wasSignedOut.current) {
        wasSignedOut.current = false;
        leave();
      }
    });
    return () => listener?.data.subscription.unsubscribe();
  }, []);
  return (
    <Screen back={!!signedIn}>
      <Heading>{l("signIn")}</Heading>
      {!backend ? (
        <Notice text={l("unconnected")} />
      ) : signedIn ? (
        <>
          <Body>{l("signedInAs")}</Body>
          {!!email && <Body small>{email}</Body>}
          <Button title={l("continue")} onPress={leave} />
        </>
      ) : signedIn === false ? (
        <>
          <Body>{l("signInIntro")}</Body>
          <Body small>{l("requiredAccount")}</Body>
          <SignInForm />
        </>
      ) : null}
    </Screen>
  );
}
function leave() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}
