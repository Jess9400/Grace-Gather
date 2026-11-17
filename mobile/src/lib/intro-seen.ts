import { useEffect, useState } from "react";
import { backend } from "./backend";
import { readIntroSeen, writeIntroSeen } from "./intro-seen-store";

// The walk to the church is shown once for each account on each phone or
// browser, after onboarding and before the church's doors. It is remembered
// per account, so a new account on the same device sees it too. If the phone cannot answer,
// the walk is shown: it has a Skip button, so it never blocks anyone.
const answers = new Map<string, boolean>();
let current: string | null = null;

async function signedInAccount() {
  if (!backend) return null;
  const { data } = await backend.auth.getSession();
  const user = data.session?.user;
  return user && !user.is_anonymous ? user.id : null;
}

// Whether the walk is still to be shown: null until the phone has answered.
export function useIntroPending() {
  const [answer, setAnswer] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    const settle = (value: boolean) => {
      if (active) setAnswer(value);
    };
    void (async () => {
      const account = await signedInAccount();
      current = account;
      if (!account) return settle(false);
      const known = answers.get(account);
      if (known !== undefined) return settle(known);
      const seen = await readIntroSeen(account).catch(() => false);
      answers.set(account, !seen);
      settle(!seen);
    })().catch(() => settle(false));
    return () => {
      active = false;
    };
  }, []);
  return answer;
}

export function markIntroSeen() {
  const account = current;
  if (!account) return;
  answers.set(account, false);
  void writeIntroSeen(account).catch(() => {
    // Shown once more on a later visit at worst; nothing depends on it.
  });
}
