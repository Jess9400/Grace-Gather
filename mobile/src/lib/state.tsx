import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { AppState } from "react-native";
import { Profile, Entry, initialProfile, normalizeProfile } from "./content";
import * as storage from "./storage";
import { savedJournalEntries } from "../generated/quiet-diary";
import { backend } from "./backend";
interface State {
  ready: boolean;
  error: string;
  profile: Profile;
  entries: Entry[];
  saveProfile: (p: Profile) => Promise<void>;
  saveEntry: (e: Entry, keep?: boolean) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  reset: () => Promise<void>;
}
const Context = createContext<State | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [profile, setProfile] = useState(initialProfile),
    [entries, setEntries] = useState<Entry[]>([]);
  const entryRef = useRef<Entry[]>([]);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let mounted = true;
    storage
      .initialize()
      .then(async () => {
        const p = await storage.getItem("profile"),
          e = await storage.getItem("entries");
        if (mounted) {
          if (p) setProfile(normalizeProfile(JSON.parse(p)));
          if (e) {
            entryRef.current = JSON.parse(e);
            setEntries(entryRef.current);
          }
          setReady(true);
        }
      })
      .catch(() =>
        setError(
          "Your private storage could not open. Your files have been preserved. Use a development build with encrypted storage, or contact hello@graceandgather.com.",
        ),
      );
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") backend?.auth.startAutoRefresh();
      else {
        backend?.auth.stopAutoRefresh();
        storage.clearPlayback();
      }
    });
    return () => sub.remove();
  }, []);
  async function saveProfile(p: Profile) {
    const next = normalizeProfile(p);
    await storage.setItem("profile", JSON.stringify(next));
    setProfile(next);
  }
  async function saveEntry(entry: Entry, keep?: boolean) {
    const task = writes.current.then(async () => {
      const previous = entryRef.current.find((e) => e.id === entry.id);
      const sessionOnly =
        keep === undefined
          ? (previous?.sessionOnly ?? entry.sessionOnly ?? false)
          : !keep;
      const next = [
        { ...entry, sessionOnly },
        ...entryRef.current.filter((e) => e.id !== entry.id),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      await storage.setItem(
        "entries",
        JSON.stringify(savedJournalEntries(next)),
      );
      entryRef.current = next;
      setEntries(next);
    });
    writes.current = task.catch(() => {});
    return task;
  }
  async function deleteEntry(id: string) {
    const task = writes.current.then(async () => {
      const entry = entryRef.current.find((e) => e.id === id);
      const next = entryRef.current.filter((e) => e.id !== id);
      await storage.setItem(
        "entries",
        JSON.stringify(savedJournalEntries(next)),
      );
      entryRef.current = next;
      setEntries(next);
      if (entry?.audio) await storage.removeAudio(entry.audio);
    });
    writes.current = task.catch(() => {});
    return task;
  }
  async function reset() {
    const task = writes.current.then(async () => {
      await storage.clearVault();
      setProfile(initialProfile);
      entryRef.current = [];
      setEntries([]);
    });
    writes.current = task.catch(() => {});
    return task;
  }
  return (
    <Context.Provider
      value={{
        ready,
        error,
        profile,
        entries,
        saveProfile,
        saveEntry,
        deleteEntry,
        reset,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const state = useContext(Context);
  if (!state) throw new Error("App provider missing");
  return state;
}
