import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  discussionReducer,
  initialDiscussions,
  type DiscussionState,
  type DiscussionAction,
} from "./discussion-model";
const CommunityContext = createContext<{
  state: DiscussionState;
  dispatch: Dispatch<DiscussionAction>;
} | null>(null);
export function CommunityPreviewProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    discussionReducer,
    undefined,
    initialDiscussions,
  );
  return (
    <CommunityContext.Provider value={{ state, dispatch }}>
      {children}
    </CommunityContext.Provider>
  );
}
export function useCommunityPreview() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error("Community preview provider is missing");
  return context;
}
