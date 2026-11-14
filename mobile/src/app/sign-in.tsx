import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Screen, Body, Button, Notice, colors, serif } from "../components/quiet-ui";
import SignInForm from "../components/SignInForm";
import { useApp } from "../lib/state";
import { label } from "../lib/labels";
import { backend } from "../lib/backend";
import { isMemberSession } from "../lib/account";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import BrandMark from "../components/BrandMark";

// One clear place to sign in. Every "Sign in" button leads here, and signing
// in returns the person to the screen they came from.
export default function SignIn() {
  const { profile } = useApp(),
    l = (k: string) => label(profile.language, k);
  const tr = useInterfaceCopy();
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
    <Screen header={false} centered keyboard>
      <View
        style={{ width: "100%", maxWidth: 360, alignSelf: "center", gap: 24 }}
      >
        {!!signedIn && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("Back")}
            onPress={leave}
            style={{ alignSelf: "flex-start", padding: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
        )}
        <View style={{ alignItems: "center", gap: 12, marginBottom: 10 }}>
          <BrandMark size={96} />
          <Text
            accessibilityRole="header"
            style={{
              color: colors.ink,
              fontSize: 15,
              letterSpacing: 3,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            GRACE & GATHER
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          style={{
            color: colors.ink,
            fontFamily: serif,
            fontSize: 29,
            lineHeight: 36,
            textAlign: "center",
          }}
        >
          {l("signInOrJoin")}
        </Text>
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
            <SignInForm chooseMethod />
          </>
        ) : null}
      </View>
    </Screen>
  );
}
function leave() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}
