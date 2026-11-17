import { useEffect, useState } from "react";
import { backend } from "./backend";
import { readIntroMark, writeIntroMark } from "./intro-seen-store";

// The walk to the church is shown once, to a new account, right after it
// finishes onboarding on this phone or browser, and before the church's
// doors. People who were already members never see it, and an account that
// signs in on a new phone with its profile already set up does not either.
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
      const mark = await readIntroMark(account).catch(() => null);
      answers.set(account, mark === "due");
      settle(mark === "due");
    })().catch(() => settle(false));
    return () => {
      active = false;
    };
  }, []);
  return answer;
}

/** Onboarding is finishing for this account: the walk comes next. */
export async function markIntroDue() {
  try {
    const account = await signedInAccount();
    if (!account) return;
    answers.set(account, true);
    await writeIntroMark(account, "due");
  } catch {
    // Without the mark the member goes straight to the doors; nothing breaks.
  }
}

export function markIntroSeen() {
  // The walk was just shown to this account: never send it back here.
  if (current) answers.set(current, false);
  void signedInAccount()
    .then((account) => {
      if (!account) return;
      answers.set(account, false);
      return writeIntroMark(account, "yes");
    })
    .catch(() => {
      // Shown once more on a later visit at worst; nothing depends on it.
    });
}
