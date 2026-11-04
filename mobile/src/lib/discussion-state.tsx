import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { backend } from "./backend";
import {
  communityError,
  loadCommunity,
  saveCommunityAction,
  type CommunityClient,
} from "./discussion-api";
import {
  discussionReducer,
  initialDiscussions,
  type DiscussionState,
  type DiscussionAction,
} from "./discussion-model";
const demo = process.env.EXPO_PUBLIC_COMMUNITY_DEMO === "true" && !backend;

const empty = (): DiscussionState => ({
  topics: [],
  blocked: [],
  reports: [],
  nextId: 1,
});
const CommunityContext = createContext<{
  state: DiscussionState;
  demo: boolean;
  automatic: boolean;
  connected: boolean;
  userId: string | null;
  moderator: boolean;
  busy: boolean;
  error: string;
  limits?: { topics: number; repliesPerTopic: number };
  reload: (topic?: string) => Promise<void>;
  perform: (action: DiscussionAction, alias?: string) => Promise<boolean>;
  screen: (postId: string) => Promise<string>;
  moderate: (postId: string) => Promise<void>;
} | null>(null);
export function CommunityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DiscussionState>(() =>
    demo ? initialDiscussions() : empty(),
  );
  const [automatic, setAutomatic] = useState(false);
  const [userId, setUserId] = useState<string | null>(demo ? "you" : null);
  const [moderator, setModerator] = useState(demo),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [limits, setLimits] = useState<{
    topics: number;
    repliesPerTopic: number;
  }>();
  const request = useRef(0);
  const identity = useRef<string | null>(demo ? "you" : null),
    generation = useRef(0),
    active = useRef(true),
    working = useRef(false),
    selectedTopic = useRef<string | undefined>(undefined);
  const reload = useCallback(async (topic?: string) => {
    if (!backend || !identity.current) return;
    selectedTopic.current = topic;
    const ticket = generation.current,
      uid = identity.current,
      loadId = ++request.current;
    try {
      const snapshot = await loadCommunity(
        backend as unknown as CommunityClient,
        topic,
      );
      if (
        !active.current ||
        ticket !== generation.current ||
        loadId !== request.current ||
        snapshot.userId !== uid
      )
        return;
      setState({
        topics: snapshot.topics,
        blocked: snapshot.blocked,
        reports: snapshot.reports,
        nextId: 1,
      });
      setAutomatic(
        snapshot.moderation?.active === true &&
          snapshot.moderation.mode === "private_rules" &&
          snapshot.moderation.externalProcessing === false,
      );
      setModerator(snapshot.moderator);
      setLimits(snapshot.limits);
      setError("");
    } catch (e) {
      if (
        active.current &&
        ticket === generation.current &&
        loadId === request.current
      )
        setError(communityError(e));
    }
  }, []);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    active.current = true;
    let observedAuth = false;
    function change(uid: string | null) {
      if (!active.current || identity.current === uid) return;
      invalidate();
      identity.current = uid;
      setUserId(uid);
      setState(empty());
      setModerator(false);
      setAutomatic(false);
      setError("");
      setLimits(undefined);
    }
    const subscription = backend?.auth.onAuthStateChange((_event, session) => {
      observedAuth = true;
      change(session?.user.id ?? null);
    });
    void backend?.auth
      .getSession()
      .then(({ data }) => {
        if (!observedAuth) change(data.session?.user.id ?? null);
      })
      .catch(() => {
        if (active.current) setError("Sign in to take part in Community.");
      });
    return () => {
      active.current = false;
      invalidate();
      subscription?.data.subscription.unsubscribe();
    };
  }, [invalidate]);
  const perform = useCallback(
    async (action: DiscussionAction, alias = "You") => {
      if (working.current) return false;
      if (demo) {
        setState((s) => discussionReducer(s, action));
        return true;
      }
      if (!backend || !identity.current) {
        setError("Sign in to take part in Community.");
        return false;
      }
      const uid = identity.current,
        ticket = generation.current;
      working.current = true;
      setBusy(true);
      setError("");
      try {
        await saveCommunityAction(
          backend as unknown as CommunityClient,
          uid,
          action,
          alias,
        );
        // The database reviews the saved post atomically, including when a client closes.
        if (ticket !== generation.current || !active.current) return false;
        await reload(selectedTopic.current);
        return true;
      } catch (e) {
        if (active.current && ticket === generation.current)
          setError(communityError(e));
        return false;
      } finally {
        working.current = false;
        if (active.current) setBusy(false);
      }
    },
    [reload],
  );
  const screen = async (postId: string) => {
    if (!backend || !moderator || working.current)
      return "Private rules are not available.";
    working.current = true;
    setBusy(true);
    const ticket = generation.current;
    try {
      const result = await backend.rpc("community_check_private", {
        p_post: postId,
      });
      if (ticket !== generation.current || !active.current) return "";
      await reload(selectedTopic.current);
      return result.error
        ? "The rules could not be checked. Nothing was published."
        : "Private rules checked. No external AI service was used.";
    } catch {
      return ticket === generation.current && active.current
        ? "The check could not finish. Publication status has not changed."
        : "";
    } finally {
      working.current = false;
      if (active.current) setBusy(false);
    }
  };
  const moderate = async (postId: string) => {
    if (!automatic) {
      setError(
        "Automatic moderation is not active. This post remains private.",
      );
      return;
    }
    if (!backend || !identity.current || working.current) return;
    working.current = true;
    setBusy(true);
    const ticket = generation.current;
    try {
      const result = await backend.rpc("community_check_private", {
        p_post: postId,
      });
      if (active.current && ticket === generation.current) {
        await reload(selectedTopic.current);
        if (result.error || result.data !== "approved")
          setError(
            "This post is still private. It does not match the limited rules or could not be checked.",
          );
      }
    } catch {
      if (active.current && ticket === generation.current)
        setError("The check could not finish. This post remains private.");
    } finally {
      working.current = false;
      if (active.current) setBusy(false);
    }
  };
  return (
    <CommunityContext.Provider
      value={{
        state,
        demo,
        automatic,
        connected: !!backend,
        userId,
        moderator,
        busy,
        error,
        limits,
        reload,
        perform,
        screen,
        moderate,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
}
export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error("Community provider is missing");
  return context;
}
