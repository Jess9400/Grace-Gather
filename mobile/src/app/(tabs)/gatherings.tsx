import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { View, Text, Pressable } from "react-native";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Row,
  Button,
  Notice,
  colors,
} from "../../components/ui";
import { useApp } from "../../lib/state";
import { copy, localized, Localized } from "../../lib/content";
import { label } from "../../lib/labels";
import { backend, requireUser } from "../../lib/backend";
interface Gathering {
  id: string;
  title: Localized;
  description: Localized;
  starts_at: string;
  ends_at: string;
  host_name: string;
  timezone: string;
}
export default function Gatherings() {
  const { profile } = useApp(),
    t = (k: string) => copy(profile.language, k),
    l = (k: string) => label(profile.language, k);
  const [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [gatherings, setGatherings] = useState<Gathering[]>([]),
    [reservations, setReservations] = useState<string[]>([]),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(""),
    [interested, setInterested] = useState(false);
  const loadVersion = useRef(0);
  const load = useCallback(async () => {
    const version = (loadVersion.current += 1);
    if (!backend) return;
    const { data, error } = await backend
      .from("gatherings")
      .select("id,title,description,starts_at,ends_at,host_name,timezone")
      .eq("status", "published")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(100);
    if (version !== loadVersion.current) return;
    if (error) {
      setNotice("gatheringsLoadError");
      return;
    }
    setNotice("");
    setGatherings(data ?? []);
    const {
      data: { user },
    } = await backend.auth.getUser();
    if (user) {
      const { data: m } = await backend
        .from("memberships")
        .select("gathering_id")
        .eq("user_id", user.id);
      const { data: i } = await backend
        .from("series_interest")
        .select("series")
        .eq("user_id", user.id)
        .maybeSingle();
      if (version !== loadVersion.current) return;
      setReservations((m ?? []).map((x) => x.gathering_id));
      setInterested(!!i);
    } else if (version === loadVersion.current) {
      setReservations([]);
      setInterested(false);
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(load);
    let timer: ReturnType<typeof setTimeout>;
    const sub = backend?.auth.onAuthStateChange((_event, session) => {
      loadVersion.current += 1;
      if (!session) {
        setReservations([]);
        setInterested(false);
      }
      clearTimeout(timer);
      timer = setTimeout(() => void load(), 0);
    });
    return () => {
      loadVersion.current += 1;
      clearTimeout(timer);
      sub?.data.subscription.unsubscribe();
    };
  }, [load]);
  async function participate(fn: () => Promise<void>) {
    if (!backend) {
      router.push("/account");
      return;
    }
    const {
      data: { user },
    } = await backend.auth.getUser();
    if (!user) {
      router.push("/account");
      return;
    }
    setBusy(true);
    try {
      await fn();
      await load();
    } catch {
      setNotice("socialError");
    } finally {
      setBusy(false);
    }
  }
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    offset = month.getDay();
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return (
    <Screen>
      <Heading>{t("gatherHeading")}</Heading>
      <Body>{t("gatherIntro")}</Body>
      <Notice
        text={
          notice === "gatheringsLoadError" ? l(notice) : notice ? t(notice) : ""
        }
      />
      {!!notice && (
        <Button secondary title={l("retry")} onPress={() => void load()} />
      )}
      <Row>
        <Button
          secondary
          title="‹"
          accessibilityLabel={t("previousMonth")}
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        />
        <Subheading>
          {month.toLocaleDateString(profile.language, {
            month: "long",
            year: "numeric",
          })}
        </Subheading>
        <Button
          secondary
          title="›"
          accessibilityLabel={t("nextMonth")}
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        />
      </Row>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: 7 }, (_, i) => (
          <View key={"w" + i} style={{ width: "14.28%", paddingVertical: 9 }}>
            <Text
              style={{ textAlign: "center", fontSize: 11, color: colors.muted }}
            >
              {new Date(2026, 10, 1 + i).toLocaleDateString(profile.language, {
                weekday: "short",
              })}
            </Text>
          </View>
        ))}
        {Array.from({ length: offset + days }, (_, i) => {
          const day = i - offset + 1;
          if (day < 1) return <View key={i} style={{ width: "14.28%" }} />;
          const d = new Date(month.getFullYear(), month.getMonth(), day),
            has = gatherings.some((g) => key(new Date(g.starts_at)) === key(d));
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === key(d) }}
              accessibilityLabel={d.toLocaleDateString(profile.language)}
              onPress={() => setSelected(selected === key(d) ? "" : key(d))}
              style={{
                width: "14.28%",
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                backgroundColor:
                  selected === key(d)
                    ? colors.green
                    : has
                      ? colors.pale
                      : "transparent",
              }}
            >
              <Text
                style={{
                  color:
                    selected === key(d) || has ? colors.cardInk : colors.ink,
                }}
              >
                {day}
                {has ? " •" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {gatherings
        .filter((g) => !selected || key(new Date(g.starts_at)) === selected)
        .map((g) => (
          <Card key={g.id}>
            <Subheading>{localized(g.title, profile.language)}</Subheading>
            <Body>{localized(g.description, profile.language)}</Body>
            <Body small>
              {new Date(g.starts_at).toLocaleString(profile.language)} ·{" "}
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </Body>
            <Body small>{g.host_name}</Body>
            <Button
              disabled={busy}
              title={l(reservations.includes(g.id) ? "leave" : "rsvp")}
              onPress={() =>
                void participate(async () => {
                  const { client } = await requireUser();
                  const { error } = await client.rpc("rsvp", {
                    p_gathering: g.id,
                    p_join: !reservations.includes(g.id),
                  });
                  if (error) throw error;
                })
              }
            />
            {reservations.includes(g.id) && (
              <Button
                secondary
                title={l("join")}
                onPress={() =>
                  router.push({
                    pathname: "/gathering/[id]",
                    params: { id: g.id },
                  })
                }
              />
            )}
          </Card>
        ))}
      {!!selected &&
        !gatherings.some((g) => key(new Date(g.starts_at)) === selected) && (
          <Body>{l("gatheringsEmpty")}</Body>
        )}
      <Card tint>
        <Subheading>{t("weeklySessionTitle")}</Subheading>
        <Body>{t("sessionDescription")}</Body>
        <Body small>{t("weeklySessionNote")}</Body>
        <Button
          disabled={busy}
          title={t(interested ? "interestSaved" : "interested")}
          onPress={() =>
            void participate(async () => {
              const { client, user } = await requireUser();
              const result = interested
                ? await client
                    .from("series_interest")
                    .delete()
                    .eq("user_id", user.id)
                : await client
                    .from("series_interest")
                    .insert({ user_id: user.id });
              if (result.error) throw result.error;
            })
          }
        />
        <Body small>{t("interestNote")}</Body>
      </Card>
      <Body small>{t("groupBoundary")}</Body>
    </Screen>
  );
}
