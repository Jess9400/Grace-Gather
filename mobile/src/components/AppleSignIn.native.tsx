import { useEffect, useState } from "react";
import * as Apple from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { requireBackend } from "../lib/backend";
export default function AppleSignIn({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    void Apple.isAvailableAsync().then(setAvailable);
  }, []);
  // Apple sign-in is configured for the app. A build can still explicitly
  // disable the option if its backend is not ready.
  if (!available || process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED === "false")
    return null;
  async function signIn() {
    try {
      const nonce = Crypto.randomUUID(),
        state = Crypto.randomUUID(),
        hashed = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          nonce,
        );
      const credential = await Apple.signInAsync({
        nonce: hashed,
        state,
        requestedScopes: [
          Apple.AppleAuthenticationScope.FULL_NAME,
          Apple.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.state !== state || !credential.identityToken)
        throw new Error("Apple sign-in could not be verified.");
      const client = requireBackend();
      const { error } = await client.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce,
      });
      if (error) throw error;
      if (credential.authorizationCode) {
        const result = await client.functions.invoke("apple-credential", {
          body: { code: credential.authorizationCode },
        });
        if (result.error)
          onError(
            "Signed in. Apple token revocation setup is incomplete; contact support before release.",
          );
      }
    } catch (e) {
      if ((e as { code?: string }).code !== "ERR_REQUEST_CANCELED")
        onError("Apple sign-in was unsuccessful. Please try again.");
    }
  }
  return (
    <Apple.AppleAuthenticationButton
      buttonType={Apple.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={Apple.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={16}
      style={{ height: 50, width: "100%" }}
      onPress={() => void signIn()}
    />
  );
}
