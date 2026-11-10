import { Redirect, useLocalSearchParams } from "expo-router";

// Discussions live in one place: Your people, behind "Discussions" on Gather.
// Older links (a verse's "Open a public discussion", Bible study, the profile
// menu) still arrive here and are passed straight on.
export default function Community() {
  const { verse, compose } = useLocalSearchParams<{
    verse?: string;
    compose?: string;
  }>();
  return (
    <Redirect
      href={{
        pathname: "/friends",
        params: {
          ...(verse ? { verse } : {}),
          ...(compose ? { compose } : {}),
        },
      }}
    />
  );
}
