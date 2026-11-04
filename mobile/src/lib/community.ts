import { useCallback, useEffect, useState } from "react";
import { backend } from "./backend";
import { data, Resource } from "./content";
export function useCatalog(kind: "feed" | "course") {
  const [items, setItems] = useState<Resource[]>(
      kind === "course" ? data.COURSES : backend ? [] : data.FEED,
    ),
    [loading, setLoading] = useState(!!backend),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    if (backend)
      void backend
        .from("content_items")
        .select("data")
        .eq("kind", kind)
        .eq("published", true)
        .then(({ data: rows, error }) => {
          if (!active) return;
          setFailed(!!error);
          if (!error) setItems((rows ?? []).map((r) => r.data as Resource));
          setLoading(false);
        });
    return () => {
      active = false;
    };
  }, [kind]);
  return { items, loading, failed };
}
export function useReactions() {
  const [liked, setLiked] = useState<string[]>([]),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [failed, setFailed] = useState(false),
    [pending, setPending] = useState<string[]>([]);
  const reload = useCallback(async () => {
    if (!backend) return;
    const {
      data: { user },
    } = await backend.auth.getUser();
    if (!user) {
      setLiked([]);
      setCounts({});
      return;
    }
    const [likes, stats] = await Promise.all([
      backend.from("likes").select("item_id").eq("user_id", user.id),
      backend.rpc("feed_stats"),
    ]);
    if (likes.error || stats.error) {
      setFailed(true);
      return;
    }
    setLiked((likes.data ?? []).map((x) => x.item_id));
    setCounts(
      Object.fromEntries(
        (stats.data ?? []).map((x: { item_id: string; likes: number }) => [
          x.item_id,
          Number(x.likes),
        ]),
      ),
    );
    setFailed(false);
  }, []);
  useEffect(() => {
    void Promise.resolve().then(reload);
    const sub = backend?.auth.onAuthStateChange(() => {
      void Promise.resolve().then(reload);
    });
    return () => sub?.data.subscription.unsubscribe();
  }, [reload]);
  async function toggle(id: string) {
    if (!backend) return false;
    const {
      data: { user },
    } = await backend.auth.getUser();
    if (!user) return false;
    setPending((p) => [...p, id]);
    try {
      const result = liked.includes(id)
        ? await backend
            .from("likes")
            .delete()
            .eq("item_id", id)
            .eq("user_id", user.id)
        : await backend
            .from("likes")
            .upsert(
              { item_id: id, user_id: user.id },
              { onConflict: "item_id,user_id", ignoreDuplicates: true },
            );
      if (result.error) throw result.error;
      await reload();
    } catch {
      setFailed(true);
    } finally {
      setPending((p) => p.filter((x) => x !== id));
    }
    return true;
  }
  return { liked, counts, failed, pending, toggle };
}
