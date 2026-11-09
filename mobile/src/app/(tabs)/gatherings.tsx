import { useClock } from "../../lib/use-clock";
import { useCallback, useState, useEffect } from "react";
import { router, useFocusEffect } from "expo-router";
import { View } from "react-native";
import { colors } from "../../components/quiet-ui";
import {
  Screen,
  Heading,
  Body,
  Button,
  Notice,
  Subheading,
  Busy,
  Field,
} from "../../components/community-ui";
import {
  FilterStrip,
  TextAction,
  Disclosure,
} from "../../components/CommunityControls";
import GatheringCalendar from "../../components/GatheringCalendar";
import { useApp } from "../../lib/state";
import { communityCopy } from "../../lib/community-copy";
import { copy } from "../../lib/content";
import { backend, requireUser } from "../../lib/backend";
import { gathering, audioCommand, Gathering } from "../../lib/gatherings";
import { storyText } from "../../lib/discover";
export default function Gatherings() {
  const now = useClock();
  const { profile } = useApp(),
    c = (k: string) => communityCopy(profile.language, k),
    t = (k: string) => copy(profile.language, k);
  const [items, setItems] = useState<Gathering[]>([]),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [tab, setTab] = useState("upcoming"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState(""),
    [interested, setInterested] = useState(false),
    [configured, setConfigured] = useState<boolean | null>(null);
  const load = useCallback(async () => {
    try {
      setItems(await gathering("list"));
      setError("");
      if ((await backend?.auth.getSession())?.data.session) {
        const interest = await backend!
          .from("series_interest")
          .select("series")
          .maybeSingle();
        setInterested(!!interest.data);
        try {
          const data = await audioCommand("catalog");
          setCounts(
            Object.fromEntries(
              data.rooms.map((r: { id: string; participants: number }) => [
                r.id,
                r.participants,
              ]),
            ),
          );
        } catch {
          setCounts({});
        }
      }
    } catch {
      setError("gatheringsLoadError");
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), 30000);
      return () => clearInterval(timer);
    }, [load]),
  );
  useEffect(() => {
    void backend?.functions
      .invoke("gathering-token", { method: "GET" })
      .then((r) => setConfigured(r.error ? null : r.data?.configured === true));
  }, []);
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const visible = items.filter(
    (g) =>
      (tab === "mine"
        ? g.reserved || g.hosting
        : g.status === "published" &&
          Date.parse(g.ends_at) > now &&
          (tab === "live"
            ? Date.parse(g.starts_at) <= now
            : Date.parse(g.starts_at) > now)) &&
      (!selected || key(new Date(g.starts_at)) === selected) &&
      `${storyText(g.title, profile.language)} ${storyText(g.description, profile.language)} ${g.topic} ${g.host_name}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  const sorted = [...visible].sort(
    (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at),
  );
  const pages = Math.max(1, Math.ceil(sorted.length / 6));
  const activePage = Math.min(page, pages - 1);
  async function interest() {
    try {
      const { client, user } = await requireUser();
      const r = interested
        ? await client.from("series_interest").delete().eq("user_id", user.id)
        : await client.from("series_interest").insert({ user_id: user.id });
      if (r.error) throw r.error;
      setInterested(!interested);
    } catch {
      router.push("/account");
    }
  }
  return (
    <Screen place="gather">
      <Heading>{c("gatherings")}</Heading>
      <GatheringCalendar
        gatherings={items}
        selected={selected}
        onSelect={(value) => {
          setSelected(value);
          setPage(0);
        }}
      />
      <Field
        label={c("searchSessions")}
        hideLabel
        placeholder={c("searchSessions")}
        value={search}
        onChangeText={(value) => {
          setSearch(value);
          setPage(0);
        }}
      />
      <FilterStrip
        value={tab}
        onChange={(value) => {
          setTab(value);
          setPage(0);
        }}
        options={["upcoming", "live", "mine"].map((value) => ({
          value,
          label: c(value),
        }))}
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <TextAction
          icon="add"
          title={c("createGathering")}
          onPress={() => router.push("/gathering/create")}
        />
        <TextAction
          icon="chatbubbles-outline"
          title={c("privateChats")}
          onPress={() => router.push("/friends")}
        />
      </View>
      <Notice text={error ? c(error) : ""} />
      {!!error && (
        <Button secondary title={c("retry")} onPress={() => void load()} />
      )}
      {configured === false && <Body small>{c("audioSetupNote")}</Body>}
      {!!selected && (
        <TextAction
          title={c("clearDate")}
          icon="close-circle-outline"
          onPress={() => {
            setSelected("");
            setPage(0);
          }}
        />
      )}
      {loading && <Busy />}
      {!loading && !error && !visible.length && (
        <Body>
          {c(
            tab === "live"
              ? "noLive"
              : tab === "mine"
                ? "noMySessions"
                : "noUpcoming",
          )}
        </Body>
      )}
      {sorted.slice(activePage * 6, (activePage + 1) * 6).map((g) => (
        <View
          key={g.id}
          style={{
            gap: 10,
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
          }}
        >
          <Body small>
            {new Date(g.starts_at).toLocaleString(profile.language, {
              timeZoneName: "short",
            })}
            {" – "}
            {new Date(g.ends_at).toLocaleTimeString(profile.language, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Body>
          {Date.parse(g.starts_at) <= now && (
            <Body small>
              {Date.parse(g.ends_at) <= now || g.status === "ended"
                ? c("ended")
                : counts[g.id] > 0
                  ? c("live") + " · " + counts[g.id] + " " + c("listening")
                  : c("readyToJoin")}
            </Body>
          )}
          <Subheading>{storyText(g.title, profile.language)}</Subheading>
          <Body>{storyText(g.description, profile.language)}</Body>
          <Body small>
            {g.host_name} · {g.topic} · {g.language.toUpperCase()}
            {g.visibility === "invite" ? " · " + c("inviteOnly") : ""}
          </Body>
          <TextAction
            title={c(
              Date.parse(g.starts_at) <= now
                ? "openRoom"
                : g.reserved
                  ? "viewGathering"
                  : "reserve",
            )}
            icon="arrow-forward"
            onPress={() => {
              if (Date.parse(g.starts_at) > now && !g.reserved) {
                void gathering("reserve", { id: g.id })
                  .then(load)
                  .catch((e) =>
                    setError(
                      e.message === "full" ? "full" : "signInGatherings",
                    ),
                  );
              } else
                router.push({
                  pathname: "/gathering/[id]",
                  params: { id: g.id },
                });
            }}
          />
          {g.reserved && Date.parse(g.starts_at) > now && (
            <TextAction
              title={c("cancelReservation")}
              onPress={() =>
                void gathering("leave", { id: g.id })
                  .then(load)
                  .catch(() => setError("actionError"))
              }
            />
          )}
        </View>
      ))}
      {pages > 1 && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <TextAction
            title={c("previousPage")}
            disabled={activePage === 0}
            onPress={() => setPage(activePage - 1)}
          />
          <Body small>
            {activePage + 1} / {pages}
          </Body>
          <TextAction
            title={c("nextPage")}
            disabled={activePage + 1 >= pages}
            onPress={() => setPage(activePage + 1)}
          />
        </View>
      )}
      <Disclosure title={c("plannedCircle")}>
        <Body>{t("weeklySessionNote")}</Body>
        <Body small>{t("groupBoundary")}</Body>
        <Button
          secondary
          title={t(interested ? "interestSaved" : "interested")}
          onPress={() => void interest()}
        />
        <Body small>{t("interestNote")}</Body>
      </Disclosure>
    </Screen>
  );
}
