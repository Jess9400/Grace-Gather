import { useEffect, useState } from "react";
import { backend } from "./backend";

/** A display hint only; the server still verifies the user for each request. */
export function useJournalAccount() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!backend) return;
    let active = true;
    let authChanges = 0;
    void backend.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && authChanges === 0) setSignedIn(!error && !!data.session);
      })
      .catch(() => {
        if (active && authChanges === 0) setSignedIn(false);
      });
    const listener = backend.auth.onAuthStateChange((_event, session) => {
      authChanges++;
      if (active) setSignedIn(!!session);
    });
    return () => {
      active = false;
      listener.data.subscription.unsubscribe();
    };
  }, []);
  return signedIn;
}
