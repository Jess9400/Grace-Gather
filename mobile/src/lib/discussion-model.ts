export const perspectives = [
  "Open discussion",
  "Orthodox perspective",
  "Catholic perspective",
  "Protestant perspective",
] as const;
export type Perspective = (typeof perspectives)[number];
export type Post = {
  id: string;
  author: string;
  name: string;
  body: string;
  status: "approved" | "pending" | "removed";
  perspective: Perspective;
};
export type Topic = Post & {
  title: string;
  verseId?: string;
  reference?: string;
  replies: Post[];
};
export type Report = {
  id: string;
  postId: string;
  reason: string;
  resolved: boolean;
};
export type DiscussionState = {
  topics: Topic[];
  blocked: string[];
  reports: Report[];
  nextId: number;
};
export type DiscussionAction =
  | {
      type: "topic";
      title: string;
      body: string;
      perspective: Perspective;
      verseId?: string;
      reference?: string;
    }
  | { type: "reply"; topicId: string; body: string; perspective: Perspective }
  | { type: "review"; postId: string; approve: boolean }
  | { type: "report"; postId: string; reason: string }
  | { type: "resolve"; reportId: string; remove: boolean }
  | { type: "block"; author: string }
  | { type: "unblock"; author: string };
const sample = (
  id: string,
  author: string,
  name: string,
  body: string,
  perspective: Perspective = "Open discussion",
): Post => ({ id, author, name, body, perspective, status: "approved" });
export function initialDiscussions(): DiscussionState {
  return {
    nextId: 1,
    blocked: [],
    reports: [],
    topics: [
      {
        ...sample(
          "light",
          "sample-anna",
          "Anna",
          "When I read ‘Let there be light,’ I think about small beginnings. What helps you notice hope when life feels uncertain?",
        ),
        title: "Finding light in small beginnings",
        verseId: "web:GEN.1.3",
        reference: "Genesis 1:3",
        replies: [
          sample(
            "light-reply",
            "sample-michael",
            "Michael",
            "For me it is sitting quietly before I reach for my phone. It does not solve everything, but it gives the day a gentler beginning.",
          ),
        ],
      },
      {
        ...sample(
          "prayer",
          "sample-elena",
          "Elena",
          "I sometimes struggle to find words for prayer. Does anyone have a simple practice that helps them begin?",
          "Orthodox perspective",
        ),
        title: "When prayer is quiet",
        replies: [
          sample(
            "prayer-reply",
            "sample-sam",
            "Sam",
            "I begin with one honest sentence. Some days that is all I have.",
          ),
        ],
      },
      {
        ...sample(
          "kindness",
          "sample-daniel",
          "Daniel",
          "I would love to hear about one small way you put a passage into practice this week. Everyday examples are welcome.",
        ),
        title: "One small act of kindness",
        replies: [],
      },
    ],
  };
}
export function verseKey(id?: string) {
  return id;
}
export function canReadPost(state: DiscussionState, post: Post) {
  return (
    post.status === "approved" &&
    !state.blocked.includes(post.author) &&
    !state.reports.some((r) => r.postId === post.id && !r.resolved)
  );
}
export function visibleTopics(state: DiscussionState, verseId?: string) {
  return state.topics.filter(
    (t) =>
      canReadPost(state, t) &&
      (!verseId || verseKey(t.verseId) === verseKey(verseId)),
  );
}
function updatePost(
  state: DiscussionState,
  postId: string,
  status: Post["status"],
) {
  return state.topics.map((t) => ({
    ...t,
    status: t.id === postId ? status : t.status,
    replies: t.replies.map((p) => (p.id === postId ? { ...p, status } : p)),
  }));
}
export function discussionReducer(
  state: DiscussionState,
  action: DiscussionAction,
): DiscussionState {
  const mine = (body: string, perspective: Perspective): Post => ({
    id: `local-${state.nextId}`,
    author: "you",
    name: "You",
    body: body.trim(),
    perspective,
    status: "pending",
  });
  switch (action.type) {
    case "topic": {
      if (
        !action.title.trim() ||
        action.title.trim().length > 100 ||
        !action.body.trim() ||
        action.body.trim().length > 2000
      )
        return state;
      return {
        ...state,
        nextId: state.nextId + 1,
        topics: [
          {
            ...mine(action.body, action.perspective),
            title: action.title.trim(),
            verseId: action.verseId,
            reference: action.reference,
            replies: [],
          },
          ...state.topics,
        ],
      };
    }
    case "reply": {
      const topic = state.topics.find((t) => t.id === action.topicId);
      if (
        !topic ||
        !canReadPost(state, topic) ||
        !action.body.trim() ||
        action.body.trim().length > 2000
      )
        return state;
      return {
        ...state,
        nextId: state.nextId + 1,
        topics: state.topics.map((t) =>
          t.id === action.topicId
            ? {
                ...t,
                replies: [...t.replies, mine(action.body, action.perspective)],
              }
            : t,
        ),
      };
    }
    case "review":
      return {
        ...state,
        topics: updatePost(
          state,
          action.postId,
          action.approve ? "approved" : "removed",
        ),
      };
    case "block":
      return action.author === "you"
        ? state
        : {
            ...state,
            blocked: [...new Set([...state.blocked, action.author])],
          };
    case "unblock":
      return {
        ...state,
        blocked: state.blocked.filter((a) => a !== action.author),
      };
    case "report": {
      const post = state.topics
        .flatMap((t) => [t, ...t.replies])
        .find((p) => p.id === action.postId);
      if (
        !post ||
        post.author === "you" ||
        !canReadPost(state, post) ||
        !action.reason.trim()
      )
        return state;
      return {
        ...state,
        nextId: state.nextId + 1,
        reports: [
          ...state.reports,
          {
            id: `report-${state.nextId}`,
            postId: action.postId,
            reason: action.reason,
            resolved: false,
          },
        ],
      };
    }
    case "resolve": {
      const report = state.reports.find(
        (r) => r.id === action.reportId && !r.resolved,
      );
      if (!report) return state;
      return {
        ...state,
        topics: action.remove
          ? updatePost(state, report.postId, "removed")
          : state.topics,
        reports: state.reports.map((r) =>
          r.id === action.reportId ? { ...r, resolved: true } : r,
        ),
      };
    }
  }
}
