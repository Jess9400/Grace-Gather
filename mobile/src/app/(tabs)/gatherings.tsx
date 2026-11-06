import { useClock } from "../../lib/use-clock";
import { useCallback, useState, useEffect } from "react";
import { router, useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../components/quiet-ui";
import { churchCopy } from "../../lib/church-copy";
import {
  Screen,
  Heading,
  Body,
  Button,
  Notice,
  Subheading,
  Busy,
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
    [tab, setTab] = useState("live"),
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
      (!selected || key(new Date(g.starts_at)) === selected),
  );
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
    <Screen>
      <Heading>{c("gatherings")}</Heading>
      <View style={styles.links}>
        {(
          [
            ["chats", "chatsSub", "chatbubbles-outline", "/community"],
            ["stories", "storiesSub", "sparkles-outline", "/(tabs)/explore"],
          ] as const
        ).map(([title, sub, icon, href], i) => (
          <Pressable
            key={title}
            accessibilityRole="button"
            accessibilityLabel={`${churchCopy(profile.language, title)}. ${churchCopy(profile.language, sub)}`}
            onPress={() => router.push(href)}
            style={({ pressed }) => [
              styles.link,
              i === 0 && styles.divider,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name={icon} size={22} color={colors.goldInk} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>
                {churchCopy(profile.language, title)}
              </Text>
              <Text style={styles.linkSub}>
                {churchCopy(profile.language, sub)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        ))}
      </View>
      <Button
        title={c("createGathering")}
        onPress={() => router.push("/gathering/create")}
      />
      <FilterStrip
        value={tab}
        onChange={setTab}
        options={["live", "upcoming", "mine"].map((value) => ({
          value,
          label: c(value),
        }))}
      />
      <Notice text={error ? c(error) : ""} />
      {!!error && (
        <Button secondary title={c("retry")} onPress={() => void load()} />
      )}
      {configured === false && <Body small>{c("audioSetupNote")}</Body>}
      {!!selected && (
        <TextAction
          title={c("clearDate")}
          icon="close-circle-outline"
          onPress={() => setSelected("")}
        />
      )}
      {loading && <Busy />}
      {!loading && !visible.length && (
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
      {visible.map((g) => (
        <View
          key={g.id}
          style={{
            gap: 10,
            paddingVertical: 20,
            borderBottomWidth: 1,
            borderBottomColor: "#B7C68F66",
          }}
        >
          <Body small>
            {Date.parse(g.ends_at) <= now || g.status === "ended"
              ? c("ended")
              : counts[g.id] > 0
                ? c("live") + " · " + counts[g.id] + " " + c("listening")
                : Date.parse(g.starts_at) <= now
                  ? c("readyToJoin")
                  : new Date(g.starts_at).toLocaleString(profile.language, {
                      timeZone: g.timezone,
                    }) +
                    " · " +
                    g.timezone}
          </Body>
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
      <GatheringCalendar
        gatherings={items}
        selected={selected}
        onSelect={setSelected}
      />
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
const styles = StyleSheet.create({
  links: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 64,
    paddingVertical: 10,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardLine,
  },
  linkTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  linkSub: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 2 },
});
