import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { backend, requireUser } from "./backend";
import { Resource, Language, localized } from "./content";
import { mergeDiscoverPage } from "./discover-page";
export interface Story extends Resource {
  anonymous?: boolean;
  origin?: "community" | "news" | "historical" | "editorial" | "publisher";
  publishedAt?: string;
  eventDate?: string;
  retrievedAt?: string;
  updatedAt?: string;
  summaryKind?: string;
  license?: string;
  licenseUrl?: string;
  author?: string;
  reflection?: string;
  sort_at?: string;
}
export const storyText = (
  value: Resource["title"] | undefined,
  language: Language,
) => localized(value, language) || Object.values(value ?? {})[0] || "";
export const storyLink = (id: string) =>
  "https://grace-gather.findflockie.workers.dev/story/" +
  encodeURIComponent(id);
export function excerpt(text: string) {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  if (paragraphs.length > 1)
    return paragraphs
      .slice(0, 2)
      .map(
        (p) =>
          p.split(/\s+/).slice(0, 70).join(" ") +
          (p.split(/\s+/).length > 70 ? "…" : ""),
      );
  const words = text.split(/\s+/);
  if (words.length <= 65) return [text];
  return [
    words.slice(0, 65).join(" "),
    words.slice(65, 140).join(" ") + (words.length > 140 ? "…" : ""),
  ];
}
export function useDiscover(filter: string, search: string) {
  const [items, setItems] = useState<Story[]>([]),
    [loading, setLoading] = useState(true),
    [more, setMore] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0),
    busy = useRef(false);
  const load = useCallback(
    async (append = false, preserveOlder = false) => {
      if (append && busy.current) return;
      const version = ++generation.current;
      busy.current = true;
      setLoading(true);
      setError("");
      try {
        if (!backend) throw Error("Account services are unavailable.");
        const last = append ? items.at(-1) : undefined;
        const { data, error } = await backend.rpc("discover_page", {
          p_filter: filter,
          p_search: search,
          p_before: last?.sort_at ?? null,
          p_after_id: last?.id ?? "",
          p_limit: 15,
        });
        if (error) throw error;
        if (version !== generation.current) return;
        const rows = (data ?? []).map(
          (r: { data: Story; sort_at: string }) => ({
            ...r.data,
            sort_at: r.sort_at,
          }),
        );
        setItems((old) => mergeDiscoverPage(old, rows, append, preserveOlder));
        if (!preserveOlder || items.length <= 15 || rows.length < 15)
          setMore(rows.length === 15);
      } catch (e) {
        if (version === generation.current)
          setError(
            e instanceof Error
              ? e.message
              : "Discover could not load. Please try again.",
          );
      } finally {
        if (version === generation.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [filter, search, items],
  );
  const loader = useRef(load);
  useEffect(() => {
    loader.current = load;
  }, [load]);
  useEffect(() => {
    void loader.current(false);
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Request counter, not a DOM ref.
      generation.current++;
      busy.current = false;
    };
  }, [filter, search]);
  return { items, loading, error, more, load };
}
type Interaction = {
  id: string;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
};
const listeners = new Set<() => void>();
export function useInteractions(ids: string[]) {
  const [state, setState] = useState<Record<string, Interaction>>({}),
    [error, setError] = useState(""),
    [pending, setPending] = useState<string[]>([]);
  const key = ids.join("|");
  const reload = useCallback(async () => {
    if (!backend || !key) return;
    const ids = key.split("|");
    const batches = await Promise.all(
      Array.from({ length: Math.ceil(ids.length / 30) }, (_, i) =>
        backend!.rpc("discover_state", {
          p_ids: ids.slice(i * 30, i * 30 + 30),
        }),
      ),
    );
    const error = batches.find((b) => b.error)?.error;
    const data = batches.flatMap((b) => b.data ?? []);
    if (error) {
      setError("Interactions could not load. Try again.");
      return;
    }
    setState(
      Object.fromEntries((data ?? []).map((x: Interaction) => [x.id, x])),
    );
    setError("");
  }, [key]);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );
  useEffect(() => {
    const f = () => void reload();
    listeners.add(f);
    const sub = backend?.auth.onAuthStateChange(() => {
      setTimeout(f, 0);
    });
    return () => {
      listeners.delete(f);
      sub?.data.subscription.unsubscribe();
    };
  }, [reload]);
  async function toggle(id: string, kind: "like" | "save" | "share") {
    setPending((p) => [...p, id]);
    setError("");
    try {
      if (kind === "share" && !(await backend?.auth.getSession())?.data.session)
        return true;
      const { client, user } = await requireUser();
      const table =
        kind === "like"
          ? "likes"
          : kind === "save"
            ? "saved_items"
            : "shared_items";
      const active =
        kind === "like"
          ? state[id]?.liked
          : kind === "save"
            ? state[id]?.saved
            : false;
      const r = active
        ? await client
            .from(table)
            .delete()
            .eq("item_id", id)
            .eq("user_id", user.id)
        : await client
            .from(table)
            .upsert(
              { item_id: id, user_id: user.id },
              { onConflict: "item_id,user_id", ignoreDuplicates: true },
            );
      if (r.error) throw r.error;
      listeners.forEach((f) => f());
      return true;
    } catch {
      setError(
        "Please sign in, then try again. Your action has not been saved.",
      );
      return false;
    } finally {
      setPending((p) => p.filter((x) => x !== id));
    }
  }
  return { state, error, pending, toggle, reload };
}
export interface Testimony {
  id: string;
  title: string;
  body: string;
  display_name: string;
  anonymous: boolean;
  tags: string[];
  language: Language;
  status: "draft" | "pending" | "published" | "rejected";
  revision: number;
  rejection_reason: string;
  updated_at: string;
}
export async function testimony(
  action: string,
  data: Record<string, unknown> = {},
) {
  const { client } = await requireUser();
  const r = await client.rpc("testimony_command", {
    p_action: action,
    p_data: data,
  });
  if (r.error) throw Error(r.error.message);
  return r.data;
}
