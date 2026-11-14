import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { backend } from "./backend";
interface Draft {
  text: string;
  createdAt: string;
  chosen: Record<string, number>;
  audio?: string;
  entryId?: string;
}
const fresh = (): Draft => ({
  text: "",
  createdAt: new Date().toISOString(),
  chosen: {},
});
const Context = createContext<{
  draft: Draft;
  update: (change: Partial<Draft>) => void;
  clear: () => void;
} | null>(null);
export function QuietProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState(fresh);
  const owner = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!backend) return;
    const listener = backend.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (owner.current !== undefined && owner.current !== next)
        setDraft(fresh());
      owner.current = next;
    });
    return () => listener.data.subscription.unsubscribe();
  }, []);
  return (
    <Context.Provider
      value={{
        draft,
        update: (change) => setDraft((d) => ({ ...d, ...change })),
        clear: () => setDraft(fresh()),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useQuiet() {
  const value = useContext(Context);
  if (!value) throw Error("Quiet provider missing");
  return value;
}
