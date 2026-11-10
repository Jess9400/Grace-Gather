import { useClock } from "../../lib/use-clock";
import { useCallback, useState, useEffect } from "react";
import { router, useFocusEffect } from "expo-router";
import { Text, View } from "react-native";
import { colors } from "../../components/quiet-ui";
import {
  Screen,
  Heading,
  Body,
  Notice,
  Subheading,
  Busy,
  Field,
  Card,
  Button,
} from "../../components/community-ui";
import { FilterStrip, TextAction } from "../../components/CommunityControls";
import GatheringCalendar from "../../components/GatheringCalendar";
import { LiveNowBanner, ChatsStrip } from "../../components/GatherHighlights";
import { gatheringTheme } from "../../lib/gathering-theme";
import { useApp } from "../../lib/state";
import { communityCopy } from "../../lib/community-copy";
import { backend } from "../../lib/backend";
import { gathering, audioCommand, Gathering } from "../../lib/gatherings";
import { storyText } from "../../lib/discover";
export default function Gatherings() {
  const now = useClock();
  const { profile } = useApp(),
    c = (k: string) => communityCopy(profile.language, k);
  const [items, setItems] = useState<Gathering[]>([]),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [tab, setTab] = useState("upcoming"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState(""),
    [configured, setConfigured] = useState<boolean | null>(null);
  const load = useCallback(async (manual = false) => {
    if (manual) setLoading(true);
    try {
      setItems(await gathering("list"));
      setError("");
      if ((await backend?.auth.getSession())?.data.session) {
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
      setError(backend ? "gatheringsLoadError" : "gatheringsNotConnected");
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
  // The gathering happening right now, if any; same rule as the Live filter.
  const liveNow = items
    .filter(
      (g) =>
        g.status === "published" &&
        Date.parse(g.starts_at) <= now &&
        Date.parse(g.ends_at) > now,
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))[0];
  const openGathering = (id: string) =>
    router.push({ pathname: "/gathering/[id]", params: { id } });
  return (
    <Screen place="gather">
      <Heading>{c("gatherings")}</Heading>
      <Body>{c("gatherIntro")}</Body>
      {liveNow && (
        <LiveNowBanner
          eyebrow={c("liveNow")}
          title={storyText(liveNow.title, profile.language)}
          detail={
            (counts[liveNow.id] > 0
              ? counts[liveNow.id] + " " + c("listening")
              : c("readyToJoin")) +
            " · " +
            c("hostedBy") +
            " " +
            liveNow.host_name
          }
          action={c("joinNow")}
          onPress={() => openGathering(liveNow.id)}
        />
      )}
      <ChatsStrip
        title={c("chats")}
        hint={c("chatsHint")}
        onPress={() => router.push("/friends")}
      />
      <Card>
        <GatheringCalendar
          gatherings={items}
          selected={selected}
          onSelect={(value) => {
            setSelected(value);
            setPage(0);
          }}
        />
      </Card>
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
      </View>
      <Notice text={error ? c(error) : ""} />
      {error === "gatheringsLoadError" && (
        <TextAction
          title={c("reloadSessions")}
          disabled={loading}
          onPress={() => void load(true)}
        />
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
      {sorted.slice(activePage * 6, (activePage + 1) * 6).map((g) => {
        const started = Date.parse(g.starts_at) <= now;
        const going = !!g.reserved && !started;
        return (
          <Card key={g.id}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {!!g.topic && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 10,
                    minHeight: 26,
                    borderRadius: 13,
                    backgroundColor: colors.pale,
                  }}
                >
                  <View
                    accessible={false}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: gatheringTheme(g).accent,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: colors.ink,
                    }}
                  >
                    {g.topic}
                  </Text>
                </View>
              )}
              {going && (
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: colors.goldInk,
                  }}
                >
                  ✓ {c("reservedPlace")}
                </Text>
              )}
            </View>
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
            {started && (
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
              {c("hostedBy")} {g.host_name} · {g.language.toUpperCase()}
              {g.visibility === "invite" ? " · " + c("inviteOnly") : ""}
            </Body>
            <Button
              title={c(
                started ? "openRoom" : g.reserved ? "viewGathering" : "reserve",
              )}
              secondary={going}
              onPress={() => {
                if (!started && !g.reserved) {
                  void gathering("reserve", { id: g.id })
                    .then(load)
                    .catch((e) =>
                      setError(
                        e.message === "full" ? "full" : "signInGatherings",
                      ),
                    );
                } else openGathering(g.id);
              }}
            />
            {going && (
              <TextAction
                title={c("cancelReservation")}
                onPress={() =>
                  void gathering("leave", { id: g.id })
                    .then(load)
                    .catch(() => setError("actionError"))
                }
              />
            )}
          </Card>
        );
      })}
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
    </Screen>
  );
}
