import { useClock } from "../../lib/use-clock";
import SafetyFooter from "../../components/SafetyFooter";
import { useCallback, useState, useEffect } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Text, View, ScrollView, useWindowDimensions } from "react-native";
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
import { nextSessionPerSeries } from "../../lib/gathering-list";
import { storyText } from "../../lib/discover";
import { journalReturnId } from "../../lib/journal-navigation";
export default function Gatherings() {
  const { width } = useWindowDimensions();
  const now = useClock();
  const { journalMatch, returnEntry } = useLocalSearchParams<{
    journalMatch?: string;
    returnEntry?: string;
  }>();
  const { profile, entries } = useApp(),
    c = (k: string) => communityCopy(profile.language, k);
  const [items, setItems] = useState<Gathering[]>([]),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [tab, setTab] = useState("upcoming"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState(""),
    [configured, setConfigured] = useState<boolean | null>(null),
    [reserving, setReserving] = useState<string | null>(null),
    [reservationNotice, setReservationNotice] = useState(""),
    // Only the team hosts gatherings for now (see the hosts_only migration).
    [canHost, setCanHost] = useState(false);
  useEffect(() => {
    void Promise.resolve(backend?.rpc("staff_role")).then((r) =>
      setCanHost(!!r?.data),
    );
  }, []);
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
        ? (g.reserved || g.hosting) && g.status === "published" && Date.parse(g.ends_at) > now
        : g.status === "published" &&
          Date.parse(g.ends_at) > now &&
          (tab === "live"
            ? Date.parse(g.starts_at) <= now
            : Date.parse(g.starts_at) > now && !g.hosting && !g.reserved)) &&
      (!selected || key(new Date(g.starts_at)) === selected) &&
      `${storyText(g.title, profile.language)} ${storyText(g.description, profile.language)} ${g.topic} ${g.host_name}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  // A weekly series is one listing, leading to its next matching session.
  // The calendar still marks every occurrence, and choosing a date selects it.
  const sorted = nextSessionPerSeries(visible);
  const pages = Math.max(1, Math.ceil(sorted.length / 6));
  const activePage = Math.min(page, pages - 1);
  // Only real, published sessions within their scheduled time appear here.
  const liveNow = items
    .filter(
      (g) =>
        g.status === "published" &&
        Date.parse(g.starts_at) <= now &&
        Date.parse(g.ends_at) > now,
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const openGathering = (id: string) =>
    router.push({ pathname: "/gathering/[id]", params: { id } });
  const liveBanner = (live: Gathering) => (
    <LiveNowBanner
      eyebrow={c("liveNow")}
      title={storyText(live.title, profile.language)}
      detail={
        (counts[live.id] > 0
          ? counts[live.id] + " " + c("listening")
          : c("readyToJoin")) + " · " + c("hostedBy") + " " + live.host_name
      }
      action={c("joinNow")}
      onPress={() => openGathering(live.id)}
    />
  );
  return (
    <Screen place="gather" back={!!journalReturnId(returnEntry, entries)}>
      <Heading>{c("gatherings")}</Heading>
      <Body>{c("gatherIntro")}</Body>
      {journalMatch === "none" && (
        <Body>
          {
            {
              en: "No matching gathering was found. You can explore others below.",
              pt: "Não encontramos um encontro correspondente. Você pode explorar outros abaixo.",
              es: "No encontramos un encuentro que coincida. Puedes explorar otros abajo.",
              ru: "Подходящей встречи не нашлось. Другие встречи можно посмотреть ниже.",
            }[profile.language]
          }
        </Body>
      )}
      {liveNow.length === 1 && liveBanner(liveNow[0])}
      {liveNow.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 12 }}>
          {liveNow.map((live) => (
            <View key={live.id} style={{ width: Math.max(220, Math.min(width - 88, 440)) }}>
              {liveBanner(live)}
            </View>
          ))}
        </ScrollView>
      )}
      {!!reservationNotice && <Notice text={reservationNotice} />}
      <ChatsStrip
        title={c("chats")}
        hint={c("chatsHint")}
        onPress={() =>
          router.push({ pathname: "/friends", params: { view: "discussions" } })
        }
      />
      <Card>
        <GatheringCalendar
          gatherings={items}
          selected={selected}
          onSelect={(value) => {
            setSelected(value);
            setPage(0);
          }}
          onOpen={openGathering}
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
        {canHost && (
          <TextAction
            icon="add"
            title={c("createGathering")}
            onPress={() => router.push("/gathering/create")}
          />
        )}
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
              disabled={reserving !== null}
              loading={reserving === g.id}
              onPress={() => {
                if (!started && !g.reserved) {
                  setReserving(g.id);
                  setReservationNotice("");
                  void gathering("reserve", { id: g.id })
                    .then(async () => {
                      await load();
                      setReservationNotice({ en: "Your place is reserved. Find it in My sessions.", pt: "Sua vaga está reservada. Encontre o encontro em Meus encontros.", es: "Tu plaza está reservada. Encuéntrala en Mis encuentros.", ru: "Ваше место забронировано. Встреча доступна в разделе «Мои встречи»." }[profile.language]);
                    })
                    .catch((e) =>
                      setError(
                        e.message === "full" ? "full" : "signInGatherings",
                      ),
                    ).finally(() => setReserving(null));
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
      <SafetyFooter />
    </Screen>
  );
}
