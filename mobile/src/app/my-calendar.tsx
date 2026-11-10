import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Button,
  Card,
  Subheading,
  Busy,
  Notice,
} from "../components/quiet-ui";
import GatheringCalendar from "../components/GatheringCalendar";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { useApp } from "../lib/state";
import { backend } from "../lib/backend";
import { gathering, Gathering } from "../lib/gatherings";
import { storyText } from "../lib/discover";
import { useClock } from "../lib/use-clock";
export default function MyCalendar() {
  const tr = useInterfaceCopy(),
    { profile } = useApp(),
    now = useClock();
  const [items, setItems] = useState<Gathering[]>([]);
  const [loading, setLoading] = useState(true),
    [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState(false),
    [selected, setSelected] = useState("");
  const [retry, setRetry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true,
        generation = retry;
      async function load() {
        const request = ++generation;
        setItems([]);
        setLoading(true);
        setError(false);
        try {
          const result = await backend?.auth.getUser();
          if (!active || request !== generation) return;
          const user = result?.data.user;
          setSignedIn(!!user);
          if (!user) return;
          const rows: Gathering[] = await gathering("list");
          if (active && request === generation)
            setItems(rows.filter((g) => g.reserved || g.hosting));
        } catch {
          if (active && request === generation) setError(true);
        } finally {
          if (active && request === generation) setLoading(false);
        }
      }
      void load();
      // Defer reads until the auth callback has released its session lock.
      const subscription = backend?.auth.onAuthStateChange(() => {
        setItems([]);
        setTimeout(() => {
          if (active) void load();
        }, 0);
      });
      return () => {
        active = false;
        subscription?.data.subscription.unsubscribe();
      };
    }, [retry]),
  );
  const upcoming = items
    .filter((g) => g.status === "published" && Date.parse(g.ends_at) > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const key = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const visible = upcoming.filter(
    (g) => !selected || key(new Date(g.starts_at)) === selected,
  );
  return (
    <Screen back>
      <Heading>{tr("My calendar")}</Heading>
      <Body small>
        {tr(
          "Gatherings you have reserved or are hosting. Times are shown in your device’s timezone.",
        )}
      </Body>
      {loading ? (
        <Busy />
      ) : !signedIn ? (
        <>
          <Body>{tr("Sign in to see your calendar.")}</Body>
          <Button
            title={tr("Sign in")}
            onPress={() => router.push("/sign-in")}
          />
        </>
      ) : error ? (
        <>
          <Notice
            text={tr("Unable to load your calendar. Please try again.")}
          />
          <Button title={tr("Retry")} onPress={() => setRetry((x) => x + 1)} />
        </>
      ) : (
        <>
          <GatheringCalendar
            gatherings={upcoming}
            selected={selected}
            onSelect={setSelected}
          />
          {!!selected && (
            <Button
              secondary
              title={tr("Clear date")}
              onPress={() => setSelected("")}
            />
          )}
          {!visible.length && (
            <Body>
              {tr(
                selected
                  ? "No gatherings on this date."
                  : "You have no upcoming gatherings yet.",
              )}
            </Body>
          )}
          {visible.map((g) => (
            <Card key={g.id}>
              <Subheading>{storyText(g.title, profile.language)}</Subheading>
              <Body>
                {new Date(g.starts_at).toLocaleString(profile.language)}
              </Body>
              <Body small>{g.host_name}</Body>
              <Button
                secondary
                title={tr("View gathering")}
                onPress={() => router.push(`/gathering/${g.id}`)}
              />
            </Card>
          ))}
          <Button
            secondary
            title={tr("Browse gatherings")}
            onPress={() => router.push("/gatherings")}
          />
        </>
      )}
    </Screen>
  );
}
