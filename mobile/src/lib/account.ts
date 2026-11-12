import { useEffect, useState } from "react";
import { backend } from "./backend";

export function isMemberSession(session: { user: { is_anonymous?: boolean } } | null) {
  return !!session && !session.user.is_anonymous;
}

// Whether someone is signed in: null while checking, false with no backend.
export function useSignedIn() {
  const [signedIn, setSignedIn] = useState<boolean | null>(
    backend ? null : false,
  );
  useEffect(() => {
    if (!backend) return;
    let alive = true;
    let receivedEvent = false;
    void backend.auth
      .getSession()
      .then(({ data }) => {
        if (alive && !receivedEvent) setSignedIn(isMemberSession(data.session));
      })
      .catch(() => {
        if (alive && !receivedEvent) setSignedIn(false);
      });
    const subscription = backend.auth.onAuthStateChange((_event, session) => {
      receivedEvent = true;
      if (alive) setSignedIn(isMemberSession(session));
    });
    return () => {
      alive = false;
      subscription.data.subscription.unsubscribe();
    };
  }, []);
  return signedIn;
}

export async function isSignedIn() {
  if (!backend) return false;
  const { data } = await backend.auth.getSession();
  return isMemberSession(data.session);
}

// The card that offers a personal reply appears only on someone's first few
// prayers, then stops asking.
export const EMAIL_ASK_PRAYERS = 3;
export function isEarlyPrayer(
  entries: { id: string; createdAt: string; deletedAt?: string }[],
  id: string,
) {
  const order = entries
    .filter((entry) => !entry.deletedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((entry) => entry.id);
  const position = order.indexOf(id);
  return position >= 0 && position < EMAIL_ASK_PRAYERS;
}
