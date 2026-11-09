import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { AppState } from "react-native";
import {
  Profile,
  Entry,
  JournalMessage,
  JournalResponse,
  initialProfile,
  normalizeProfile,
} from "./content";
import * as storage from "./storage";
import { savedJournalEntries } from "../generated/quiet-diary";
import { backend } from "./backend";
import { JOURNAL_MESSAGE_LIMIT } from "./journal-chat";
import {
  acknowledgeCleanup,
  applyJournalRetention,
  mergeJournalWriting,
  deleteConversation,
  restoreConversation,
} from "./journal-retention";
interface State {
  ready: boolean;
  error: string;
  profile: Profile;
  entries: Entry[];
  journalItems: Entry[];
  saveProfile: (p: Profile) => Promise<void>;
  saveEntry: (e: Entry, keep?: boolean) => Promise<void>;
  saveJournalResponse: (id: string, response: JournalResponse) => Promise<void>;
  appendJournalMessages: (
    id: string,
    messages: JournalMessage[],
  ) => Promise<Entry>;
  deleteEntry: (id: string) => Promise<void>;
  restoreEntry: (id: string) => Promise<void>;
  removeConversation: (id: string) => Promise<void>;
  recoverConversation: (id: string, conversationId: string) => Promise<void>;
  keepConversation: (id: string) => Promise<void>;
  acknowledgeJournalNotices: (ids: string[]) => Promise<void>;
  reloadJournal: () => Promise<void>;
  reset: () => Promise<void>;
}
const Context = createContext<State | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [profile, setProfile] = useState(initialProfile),
    [journalItems, setEntries] = useState<Entry[]>([]);
  const entryRef = useRef<Entry[]>([]),
    profileRef = useRef(initialProfile);
  const writes = useRef(Promise.resolve());
  const commitEntries = useCallback((change: (entries: Entry[]) => Entry[]) => {
    const task = writes.current.then(() =>
      storage.withJournalLock(async () => {
        const persisted: Entry[] = JSON.parse(
          (await storage.getItem("entries")) ?? "[]",
        );
        const sessions = entryRef.current.filter(
          (e) => e.sessionOnly && !persisted.some((p) => p.id === e.id),
        );
        const next = change([...persisted, ...sessions]);
        await storage.setItem(
          "entries",
          JSON.stringify(savedJournalEntries(next)),
        );
        entryRef.current = next;
        setEntries(next);
      }),
    );
    writes.current = task.catch(() => {});
    return task;
  }, []);
  const runRetention = useCallback(() => {
    const task = writes.current.then(() =>
      storage.withJournalLock(async () => {
        if (!storage.automaticCleanupSupported) return;
        const fresh: Entry[] = JSON.parse(
          (await storage.getItem("entries")) ?? "[]",
        );
        const p = JSON.parse((await storage.getItem("profile")) ?? "null");
        const result = applyJournalRetention(
          fresh,
          p?.deleteJournalChatsAfter90Days === true,
        );
        if (!result.changed) return;
        // Only expired, already-deleted entries reach this branch. If removing an
        // audio file fails, keep its tombstone so the next run can retry.
        for (const audio of result.removedAudio)
          await storage.removeAudio(audio);
        await storage.setItem(
          "entries",
          JSON.stringify(savedJournalEntries(result.entries)),
        );
        const sessions = entryRef.current.filter(
          (e) =>
            e.sessionOnly && !result.entries.some((saved) => saved.id === e.id),
        );
        entryRef.current = [...result.entries, ...sessions];
        setEntries(entryRef.current);
      }),
    );
    writes.current = task.catch(() => {});
    return task;
  }, []);
  const reloadJournal = useCallback(async () => {
    await writes.current;
    const p = await storage.getItem("profile"),
      e = await storage.getItem("entries");
    profileRef.current = p ? normalizeProfile(JSON.parse(p)) : initialProfile;
    entryRef.current = e ? JSON.parse(e) : [];
    setProfile(profileRef.current);
    setEntries(entryRef.current);
    // A failed cleanup must never prevent access to the intact journal.
    await runRetention().catch(() => {});
  }, [runRetention]);
  useEffect(() => {
    let mounted = true;
    storage
      .initialize()
      .then(async () => {
        if (!mounted) return;
        await reloadJournal();
        if (mounted) setReady(true);
      })
      .catch(() =>
        setError(
          "Your private storage could not open. Your files have been preserved. Use a development build with encrypted storage, or contact hello@graceandgather.com.",
        ),
      );
    return () => {
      mounted = false;
    };
  }, [reloadJournal]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        backend?.auth.startAutoRefresh();
        if (ready) void runRetention().catch(() => {});
      } else {
        backend?.auth.stopAutoRefresh();
        storage.clearPlayback();
      }
    });
    const timer = ready
      ? setInterval(() => {
          void runRetention().catch(() => {});
        }, 60_000)
      : undefined;
    return () => {
      sub.remove();
      if (timer) clearInterval(timer);
    };
  }, [ready, runRetention]);
  async function saveProfile(p: Profile) {
    const task = writes.current.then(() =>
      storage.withJournalLock(async () => {
        const next = normalizeProfile(p);
        await storage.setItem("profile", JSON.stringify(next));
        profileRef.current = next;
        setProfile(next);
      }),
    );
    writes.current = task.catch(() => {});
    await task;
    await runRetention().catch(() => {});
  }
  async function saveEntry(entry: Entry, keep?: boolean) {
    await commitEntries((all) => {
      const previous = all.find((e) => e.id === entry.id);
      if (previous?.deletedAt) throw Error("entry_deleted");
      const sessionOnly =
        keep === undefined
          ? (previous?.sessionOnly ?? entry.sessionOnly ?? false)
          : !keep;
      return [
        {
          ...mergeJournalWriting(previous, entry),
          sessionOnly,
        },
        ...all.filter((e) => e.id !== entry.id),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }
  async function saveJournalResponse(id: string, response: JournalResponse) {
    await commitEntries((all) =>
      all.map((e) =>
        e.id === id && !e.deletedAt && !e.response ? { ...e, response } : e,
      ),
    );
  }
  async function appendJournalMessages(id: string, messages: JournalMessage[]) {
    let updated: Entry | undefined;
    await commitEntries((all) => {
      const previous = all.find((e) => e.id === id && !e.deletedAt);
      if (!previous) throw Error("entry_not_found");
      const existing = previous.conversation ?? [];
      const fresh = messages.filter(
        (m) => !existing.some((saved) => saved.id === m.id),
      );
      if (!fresh.length) {
        updated = previous;
        return all;
      }
      const conversation = [
        ...existing,
        ...fresh.map((m) => ({
          ...m,
          createdAt: m.createdAt ?? new Date().toISOString(),
        })),
      ];
      if (conversation.length > JOURNAL_MESSAGE_LIMIT)
        throw Error("conversation_full");
      updated = {
        ...previous,
        conversation,
        conversationUpdatedAt: new Date().toISOString(),
        chatCleanup: undefined,
      };
      return all.map((e) => (e.id === id ? updated! : e));
    });
    return updated!;
  }
  async function deleteEntry(id: string) {
    await commitEntries((all) =>
      all.map((e) =>
        e.id === id
          ? {
              ...e,
              deletedAt: new Date().toISOString(),
              chatCleanup: undefined,
            }
          : e,
      ),
    );
  }
  async function restoreEntry(id: string) {
    await commitEntries((all) =>
      all.map((e) =>
        e.id === id
          ? {
              ...e,
              deletedAt: undefined,
              keepConversation: true,
              chatCleanup: undefined,
            }
          : e,
      ),
    );
  }
  async function removeConversation(id: string) {
    await commitEntries((all) =>
      all.map((e) => (e.id === id && !e.deletedAt ? deleteConversation(e) : e)),
    );
  }
  async function recoverConversation(id: string, conversationId: string) {
    await commitEntries((all) =>
      all.map((e) =>
        e.id === id && !e.deletedAt
          ? restoreConversation(e, conversationId)
          : e,
      ),
    );
  }
  async function keepConversation(id: string) {
    await commitEntries((all) =>
      all.map((e) =>
        e.id === id
          ? { ...e, keepConversation: true, chatCleanup: undefined }
          : e,
      ),
    );
  }
  async function acknowledgeJournalNotices(ids: string[]) {
    await commitEntries((all) =>
      all.map((e) => (ids.includes(e.id) ? acknowledgeCleanup(e) : e)),
    );
  }
  async function reset() {
    const task = writes.current.then(() =>
      storage.withJournalLock(async () => {
        await storage.clearVault();
        profileRef.current = initialProfile;
        entryRef.current = [];
        setProfile(initialProfile);
        setEntries([]);
      }),
    );
    writes.current = task.catch(() => {});
    return task;
  }
  return (
    <Context.Provider
      value={{
        ready,
        error,
        profile,
        journalItems,
        entries: journalItems.filter((e) => !e.deletedAt),
        saveProfile,
        saveEntry,
        saveJournalResponse,
        appendJournalMessages,
        deleteEntry,
        restoreEntry,
        removeConversation,
        recoverConversation,
        keepConversation,
        acknowledgeJournalNotices,
        reloadJournal,
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
