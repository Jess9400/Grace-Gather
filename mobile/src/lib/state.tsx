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
import { setTraditionWording } from "./tradition-wording";
import { isOrthodox } from "./church-calendar";
import { savedJournalEntries } from "../generated/quiet-diary";
import { backend } from "./backend";
import { isMemberSession } from "./account";
import { accountJournalStore } from "./account-journal-store";
import { updateAccountJournal } from "./account-journal-write";
import {
  createJournalSessionGate,
  planJournalImport,
} from "./account-journal-session";
import { planAccountRetention } from "./account-journal-retention";
import { deleteJournalAudio } from "./account-journal-audio";
import { AI_CONSENT_VERSION } from "./ai-copy";
import { JOURNAL_MESSAGE_LIMIT } from "./journal-chat";
import { applyRetriedGuidance } from "./journal-retry";
import {
  acknowledgeCleanup,
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
  journalLoading: boolean;
  journalUnavailable: boolean;
  legacyJournalAvailable: boolean;
  importLegacyJournal: () => Promise<void>;
  restoreJournalBackup: (uri: string, key: string) => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
  saveEntry: (e: Entry, keep?: boolean) => Promise<void>;
  chooseJournalStep: (id: string, action: string) => Promise<void>;
  acknowledgeJournalStep: (id: string, chosenAt: string) => Promise<void>;
  saveJournalResponse: (id: string, response: JournalResponse) => Promise<void>;
  saveRetriedGuidance: (
    id: string,
    expectedText: string,
    guidance: Partial<Entry>,
  ) => Promise<void>;
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
    [journalItems, setEntries] = useState<Entry[]>([]),
    [journalLoading, setJournalLoading] = useState(false),
    [journalUnavailable, setJournalUnavailable] = useState(false),
    [legacyJournalAvailable, setLegacyJournalAvailable] = useState(false);
  const entryRef = useRef<Entry[]>([]),
    profileRef = useRef(initialProfile),
    journalOwner = useRef<string | null>(null),
    gate = useRef(createJournalSessionGate()),
    loadSequence = useRef(0);
  const writes = useRef(Promise.resolve());
  const switchOwner = useCallback((owner: string | null) => {
    if (journalOwner.current === owner) return;
    journalOwner.current = owner;
    loadSequence.current += 1;
    gate.current.switchOwner(owner);
    entryRef.current = [];
    setEntries([]);
    setJournalUnavailable(false);
    setJournalLoading(!!owner);
    setLegacyJournalAvailable(false);
    profileRef.current = { ...profileRef.current, journalAIConsentVersion: undefined, deleteJournalChatsAfter90Days: false };
    setProfile(profileRef.current);
  }, []);
  const loadAccountJournal = useCallback(async () => {
    const ticket = gate.current.capture();
    if (!ticket.owner) return;
    const sequence = ++loadSequence.current;
    const current = () => ticket.current() && sequence === loadSequence.current;
    setJournalLoading(true);
    try {
      await writes.current;
      if (!current()) return;
      // Consent belongs to the account, never to a shared device profile.
      const [permission, cleanup] = backend ? await Promise.all([
        backend.rpc("ai_journal_permission"),
        backend.rpc("journal_cleanup_enabled"),
      ]) : [null, null];
      if (!current()) return;
      profileRef.current = {
        ...profileRef.current,
        journalAIConsentVersion: !permission?.error && permission?.data === true ? AI_CONSENT_VERSION : undefined,
        deleteJournalChatsAfter90Days: !cleanup?.error && cleanup?.data === true,
      };
      setProfile(profileRef.current);
      const result = await accountJournalStore(ticket.owner).read();
      if (!current()) return;
      const entries = result?.entries ?? [];
      const legacy: Entry[] = JSON.parse(
        (await storage.getItem("entries")) ?? "[]",
      );
      const imported = await storage.getItem(
        `account-journal-imported:${ticket.owner}`,
      );
      if (!current()) return;
      setLegacyJournalAvailable(legacy.length > 0 && imported !== "yes");
      await storage.setItem(
        `account-journal:${ticket.owner}`,
        JSON.stringify(entries),
      );
      if (!current()) return;
      entryRef.current = entries;
      setEntries(entries);
      setJournalUnavailable(false);
    } catch {
      if (!current()) return;
      const cache = await storage
        .getItem(`account-journal:${ticket.owner}`)
        .catch(() => null);
      if (!current()) return;
      try {
        const parsed = cache ? JSON.parse(cache) : [];
        entryRef.current = Array.isArray(parsed) ? parsed : [];
      } catch {
        entryRef.current = [];
      }
      setEntries(entryRef.current);
      setJournalUnavailable(true);
    } finally {
      if (current()) setJournalLoading(false);
    }
  }, []);
  const commitEntries = useCallback((change: (entries: Entry[]) => Entry[]) => {
    const ticket = gate.current.capture();
    loadSequence.current += 1;
    const task = writes.current.then(() =>
      storage.withJournalLock(async () => {
        if (!ticket.owner || !ticket.current())
          throw Error("journal_account_changed");
        const sessions = entryRef.current.filter((e) => e.sessionOnly);
        let next: Entry[] = [];
        const saved = await updateAccountJournal(
          accountJournalStore(ticket.owner),
          (persisted) => {
            next = change([
              ...persisted,
              ...sessions.filter((e) => !persisted.some((p) => p.id === e.id)),
            ]);
            const removing = new Set(
              persisted
                .filter((entry) => entry.purgeRequestedAt && entry.audio)
                .map((entry) => entry.audio),
            );
            if (
              next.some(
                (entry) =>
                  !entry.deletedAt && entry.audio && removing.has(entry.audio),
              )
            )
              throw Error("journal_removal_in_progress");
            return savedJournalEntries(next);
          },
        );
        if (!ticket.current()) throw Error("journal_account_changed");
        await storage.setItem(
          `account-journal:${ticket.owner}`,
          JSON.stringify(saved),
        );
        if (!ticket.current()) throw Error("journal_account_changed");
        entryRef.current = next;
        setEntries(next);
        setJournalUnavailable(false);
        setJournalLoading(false);
      }),
    );
    writes.current = task.catch(() => {
      if (ticket.current()) {
        setJournalLoading(false);
        setJournalUnavailable(true);
      }
    });
    return task;
  }, []);
  const runRetention = useCallback(() => {
    const task = writes.current.then(() =>
      storage.withJournalLock(async () => {
        const ticket = gate.current.capture();
        if (!ticket.owner || !ticket.current()) return;
        // Never act on a cleanup preference copied from a shared device or
        // cached while the account is unreachable.
        if (!backend) return;
        const cleanup = await backend.rpc("journal_cleanup_enabled");
        if (cleanup.error || !ticket.current()) return;
        const cleanupEnabled = cleanup.data === true;
        const initial = planAccountRetention(
          entryRef.current,
          cleanupEnabled,
        );
        if (!initial.changed && !initial.audioToRemove.length) return;
        const next = await updateAccountJournal(
          accountJournalStore(ticket.owner),
          (fresh) => {
            return savedJournalEntries(
              planAccountRetention(
                fresh,
                cleanupEnabled,
              ).entries,
            );
          },
        );
        if (!ticket.current()) return;
        await storage.setItem(
          `account-journal:${ticket.owner}`,
          JSON.stringify(next),
        );
        if (!ticket.current()) return;
        entryRef.current = next;
        setEntries(next);
        for (const entry of next.filter(
          (item) => item.purgeRequestedAt && item.deletedAt && item.audio,
        )) {
          if (!ticket.current()) return;
          await deleteJournalAudio(ticket.owner, entry.audio!);
          const remaining = await updateAccountJournal(
            accountJournalStore(ticket.owner),
            (fresh) =>
              fresh.filter(
                (item) =>
                  !(
                    item.id === entry.id &&
                    item.audio === entry.audio &&
                    item.deletedAt === entry.deletedAt &&
                    item.purgeRequestedAt === entry.purgeRequestedAt
                  ),
              ),
          );
          if (!ticket.current()) return;
          await storage.setItem(
            `account-journal:${ticket.owner}`,
            JSON.stringify(remaining),
          );
          if (!ticket.current()) return;
          entryRef.current = remaining;
          setEntries(remaining);
        }
      }),
    );
    writes.current = task.catch(() => {});
    return task;
  }, []);
  const reloadJournal = useCallback(async () => {
    await writes.current;
    const p = await storage.getItem("profile");
    profileRef.current = { ...(p ? normalizeProfile(JSON.parse(p)) : initialProfile), journalAIConsentVersion: undefined, deleteJournalChatsAfter90Days: false };
    setProfile(profileRef.current);
    const session = backend ? await backend.auth.getSession() : null;
    switchOwner(
      isMemberSession(session?.data.session ?? null)
        ? session!.data.session!.user.id
        : null,
    );
    await loadAccountJournal();
    // A failed cleanup must never prevent access to the intact journal.
    await runRetention().catch(() => {});
  }, [runRetention, switchOwner, loadAccountJournal]);
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
          "Your private storage could not open. Your files have been preserved. Use a development build with encrypted storage, or contact hello@graceandgather.online.",
        ),
      );
    return () => {
      mounted = false;
    };
  }, [reloadJournal]);
  useEffect(() => {
    if (!ready || !backend) return;
    const subscription = backend.auth.onAuthStateChange((_event, session) => {
      const owner = isMemberSession(session) ? session!.user.id : null;
      if (owner === journalOwner.current) return;
      switchOwner(owner);
      // Auth callbacks must not await other Supabase operations.
      if (owner) setTimeout(() => void loadAccountJournal(), 0);
    });
    return () => subscription.data.subscription.unsubscribe();
  }, [ready, switchOwner, loadAccountJournal]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        backend?.auth.startAutoRefresh();
        if (ready)
          void writes.current
            .then(loadAccountJournal)
            .then(runRetention)
            .catch(() => {});
      } else {
        backend?.auth.stopAutoRefresh();
        storage.clearPlayback();
      }
    });
    const timer = ready
      ? setInterval(() => {
          void writes.current
            .then(loadAccountJournal)
            .then(runRetention)
            .catch(() => {});
        }, 60_000)
      : undefined;
    return () => {
      sub.remove();
      if (timer) clearInterval(timer);
    };
  }, [ready, runRetention, loadAccountJournal]);
  async function saveProfile(p: Profile) {
    const ticket = gate.current.capture();
    const task = writes.current.then(() =>
      storage.withJournalLock(async () => {
        const next = normalizeProfile(p);
        const desired = next.journalAIConsentVersion === AI_CONSENT_VERSION;
        const current = profileRef.current.journalAIConsentVersion === AI_CONSENT_VERSION;
        if (desired !== current) {
          if (!backend || !ticket.owner || !ticket.current()) throw Error("journal_account_changed");
          const result = await backend.rpc("set_ai_journal_permission", {p_allowed:desired,p_expected_user:ticket.owner});
          if (result.error) throw result.error;
          if (!ticket.current()) throw Error("journal_account_changed");
        }
        if (next.deleteJournalChatsAfter90Days !== profileRef.current.deleteJournalChatsAfter90Days) {
          if (!backend || !ticket.owner || !ticket.current()) throw Error("journal_account_changed");
          const result = await backend.rpc("set_journal_cleanup_enabled", {p_enabled:next.deleteJournalChatsAfter90Days === true,p_expected_user:ticket.owner});
          if (result.error) throw result.error;
          if (!ticket.current()) throw Error("journal_account_changed");
        }
        await storage.setItem("profile", JSON.stringify({...next,journalAIConsentVersion:undefined,deleteJournalChatsAfter90Days:undefined}));
        if (ticket.owner && !ticket.current()) throw Error("journal_account_changed");
        profileRef.current = next;
        setProfile(next);
      }),
    );
    writes.current = task.catch(() => {});
    await task;
    await runRetention().catch(() => {});
  }
  async function importLegacyJournal() {
    const ticket = gate.current.capture();
    if (!ticket.owner || !ticket.current())
      throw Error("journal_account_changed");
    const legacy: Entry[] = savedJournalEntries(
      JSON.parse((await storage.getItem("entries")) ?? "[]"),
    );
    await commitEntries((current) => {
      const planned = planJournalImport(current, legacy);
      // Never replace an account entry with different device data under the same ID.
      for (const id of planned.conflicts) {
        const existing = current.find((entry) => entry.id === id);
        const incoming = legacy.find((entry) => entry.id === id);
        if (JSON.stringify(existing) !== JSON.stringify(incoming))
          throw Error("journal_import_conflict");
      }
      return planned.entries;
    });
    if (!ticket.current()) throw Error("journal_account_changed");
    await storage.setItem(`account-journal-imported:${ticket.owner}`, "yes");
    if (ticket.current()) setLegacyJournalAvailable(false);
  }
  async function restoreJournalBackup(uri: string, key: string) {
    const ticket = gate.current.capture();
    if (!ticket.owner || !ticket.current())
      throw Error("journal_account_changed");
    const staging = `journal-restore:${ticket.owner}`;
    await storage.restoreEncrypted(uri, key, staging);
    if (!ticket.current()) throw Error("journal_account_changed");
    const restored: Entry[] = JSON.parse(
      (await storage.getItem(staging)) ?? "[]",
    );
    await commitEntries((current) => {
      const planned = planJournalImport(current, restored);
      for (const id of planned.conflicts) {
        if (
          JSON.stringify(current.find((entry) => entry.id === id)) !==
          JSON.stringify(restored.find((entry) => entry.id === id))
        )
          throw Error("journal_import_conflict");
      }
      return planned.entries;
    });
    if (!ticket.current()) throw Error("journal_account_changed");
    await storage.removeItem(staging);
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
  async function chooseJournalStep(id: string, action: string) {
    await commitEntries((all) =>
      all.map((entry) => {
        if (entry.id !== id || entry.deletedAt || entry.sessionOnly)
          return entry;
        if (
          entry.step?.id === action &&
          !entry.step.checkedAt &&
          !entry.step.status
        )
          return entry;
        return {
          ...entry,
          step: { id: action, chosenAt: new Date().toISOString() },
        };
      }),
    );
  }
  async function acknowledgeJournalStep(id: string, chosenAt: string) {
    await commitEntries((all) =>
      all.map((entry) => {
        if (
          entry.id !== id ||
          entry.deletedAt ||
          entry.step?.chosenAt !== chosenAt
        )
          return entry;
        return {
          ...entry,
          step: { ...entry.step, checkedAt: new Date().toISOString() },
        };
      }),
    );
  }
  async function saveJournalResponse(id: string, response: JournalResponse) {
    await commitEntries((all) =>
      all.map((e) =>
        e.id === id && !e.deletedAt && !e.response ? { ...e, response } : e,
      ),
    );
  }
  async function saveRetriedGuidance(
    id: string,
    expectedText: string,
    guidance: Partial<Entry>,
  ) {
    await commitEntries((all) =>
      applyRetriedGuidance(all, id, expectedText, guidance),
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
          ? e.purgeRequestedAt
            ? (() => {
                throw Error("journal_removal_in_progress");
              })()
            : {
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
  // Wording that depends on tradition (Orthodox «поставить свечу») follows
  // the current profile; set before any child reads copy this render.
  setTraditionWording(isOrthodox(profile), profile.language);
  return (
    <Context.Provider
      value={{
        ready,
        error,
        profile,
        journalItems,
        journalLoading,
        journalUnavailable,
        legacyJournalAvailable,
        importLegacyJournal,
        restoreJournalBackup,
        entries: journalItems.filter((e) => !e.deletedAt),
        saveProfile,
        saveEntry,
        chooseJournalStep,
        acknowledgeJournalStep,
        saveJournalResponse,
        saveRetriedGuidance,
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
