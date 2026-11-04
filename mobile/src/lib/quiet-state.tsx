import React, { createContext, useContext, useState } from "react";
interface Draft {
  text: string;
  createdAt: string;
  chosen: Record<string, number>;
  audio?: string;
  keep: boolean;
  entryId?: string;
}
const fresh = (): Draft => ({
  text: "",
  createdAt: new Date().toISOString(),
  chosen: {},
  keep: false,
});
const Context = createContext<{
  draft: Draft;
  update: (change: Partial<Draft>) => void;
  clear: () => void;
} | null>(null);
export function QuietProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState(fresh);
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
