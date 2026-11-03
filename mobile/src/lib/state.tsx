import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { Profile, Entry, initialProfile, normalizeProfile } from "./content";
import * as storage from "./storage";
import { backend } from "./backend";
interface State {
  ready: boolean;
  error: string;
  profile: Profile;
  entries: Entry[];
  saveProfile: (p: Profile) => Promise<void>;
  saveEntry: (e: Entry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  reset: () => Promise<void>;
}
const Context = createContext<State | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [profile, setProfile] = useState(initialProfile),
    [entries, setEntries] = useState<Entry[]>([]);
  useEffect(() => {
    let mounted = true;
    storage
      .initialize()
      .then(async () => {
        const p = await storage.getItem("profile"),
          e = await storage.getItem("entries");
        if (mounted) {
          if (p) setProfile(normalizeProfile(JSON.parse(p)));
          if (e) setEntries(JSON.parse(e));
          setReady(true);
        }
      })
      .catch(() =>
        setError(
          "Your private storage could not open. Your files have been preserved. Use a development build with encrypted storage, or contact hello@awaychurch.com.",
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
  async function saveEntry(entry: Entry) {
    const next = [entry, ...entries.filter((e) => e.id !== entry.id)].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
    await storage.setItem("entries", JSON.stringify(next));
    setEntries(next);
  }
  async function deleteEntry(id: string) {
    const entry = entries.find((e) => e.id === id);
    const next = entries.filter((e) => e.id !== id);
    await storage.setItem("entries", JSON.stringify(next));
    setEntries(next);
    if (entry?.audio) await storage.removeAudio(entry.audio);
  }
  async function reset() {
    await storage.clearVault();
    setProfile(initialProfile);
    setEntries([]);
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
