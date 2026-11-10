import { useInterfaceCopy } from "../../lib/use-interface-copy";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  useFocusEffect,
  useNavigation,
  useLocalSearchParams,
  router,
} from "expo-router";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/state";
import { copy } from "../../lib/content";
import { backend } from "../../lib/backend";
import { confessionAPI, Confession } from "../../lib/confession";
import { removeAudio } from "../../lib/storage";
import {
  Screen,
  SurfaceTheme,
  Card,
  Button,
  Body,
  Field,
  Notice,
  Row,
  Chip,
  colors,
  s as sharedStyles,
} from "../../components/community-ui";
import {
  ActionCard,
  Disclosure,
  TextAction,
} from "../../components/CommunityControls";
import { designCopy } from "../../lib/design-copy";
import Recorder from "../../components/Recorder";
import AudioPlayback from "../../components/AudioPlayback";
import ConfessionAudio from "../../components/ConfessionAudio";
import ConfessionArrival, {
  ConfessionLattice,
} from "../../components/ConfessionArrival";
import { confessionColors as room } from "../../lib/confession-theme";
import { useRoomStrip } from "../../components/ChurchStrip";
type Page =
  "room" | "share" | "list" | "mine" | "detail" | "success" | "review";
const themes = [
    "loneliness",
    "regret",
    "grief",
    "fear",
    "relationships",
    "faith",
    "other",
  ],
  responses = ["listen", "encouragement", "prayer"];
export default function ConfessionRoom() {
  const tr = useInterfaceCopy();
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const { profile } = useApp(),
    language = profile.language,
    t = (key: string) => copy(language, key);
  const navigation = useNavigation();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const d = (key: Parameters<typeof designCopy>[1]) =>
    designCopy(language, key);
  const [themeOpen, setThemeOpen] = useState(false),
    [responseOpen, setResponseOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [preview, setPreview] = useState("");
  const [page, setPage] = useState<Page>("room"),
    [entering, setEntering] = useState(false),
    [body, setBody] = useState(""),
    [theme, setTheme] = useState("loneliness"),
    [responseType, setResponseType] = useState("listen"),
    [consent, setConsent] = useState(false),
    [audienceDetailsOpen, setAudienceDetailsOpen] = useState(false),
    [audio, setAudio] = useState<string>(),
    [recording, setRecording] = useState(false),
    [textInstead, setTextInstead] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [items, setItems] = useState<Confession[]>([]),
    [reserved, setReserved] = useState<Confession[]>([]),
    [detail, setDetail] = useState<Confession | null>(null),
    [reply, setReply] = useState<Confession | null>(null),
    [draft, setDraft] = useState(""),
    [report, setReport] = useState<string | null>(null),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [success, setSuccess] = useState("share"),
    [support, setSupport] = useState(false);
  // The first page opens with its corner of the church across the top.
  const strip = useRoomStrip("confession");
  const enterRoom = useCallback((record = false) => {
    setAudioOpen(record);
    setEntering(false);
    setPage("share");
  }, [setPage]);
  const cancelEntrance = useCallback(() => {
    setEntering(false);
    setPage("room");
  }, [setPage]);
  useFocusEffect(useCallback(() => () => setEntering(false), []));
  function startEntrance() {
    setPage("share");
    setEntering(true);
  }
  useEffect(() => {
    navigation.setOptions({
      tabBarHideOnKeyboard: page === "share",
      // Sharing keeps the room's own colours; every other page uses the
      // espresso tab bar the rest of the church uses.
      tabBarStyle:
        page === "share"
          ? { backgroundColor: room.background, borderTopColor: room.line }
          : { backgroundColor: colors.ink, borderTopColor: "#FFFFFF14" },
      tabBarActiveTintColor: page === "share" ? room.accent : "#FFF8E9",
      tabBarInactiveTintColor: page === "share" ? room.muted : "#CFC3B1",
    });
  }, [navigation, page]);
  useEffect(() => {
    if (view !== "review") return;
    let active = true;
    // The API verifies moderator authorization; the account link is only navigation.
    void confessionAPI("queue", { language })
      .then((result) => {
        if (!active) return;
        setError("");
        setItems(result.items);
        setReserved([]);
        setReport(null);
        setPage("review");
      })
      .catch(() => {
        if (active) setError(copy(language, "cError"));
      })
      .finally(() => {
        if (active) {
          router.setParams({ view: "" });
        }
      });
    return () => {
      active = false;
    };
  }, [view, language]);
  async function run(fn: () => Promise<void>) {
    if (busy || recording || view === "review") return;
    setBusy(true);
    setNeedsSignIn(false);
    setError("");
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "sign_in_required" || msg === "unauthorized") {
        setNeedsSignIn(true);
        setError(
          tr(
            "Sign in to offer comfort or share a confession. Your draft stays here.",
          ),
        );
        return;
      }
      setError(
        t(
          !backend
            ? "cOffline"
            : ["not_available", "not_found"].includes(msg)
              ? "cUnavailable"
              : msg === "invalid_audio"
                ? "cAudioLimit"
                : "cError",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function load(next: "list" | "mine" | "review") {
    const r = await confessionAPI(next === "review" ? "queue" : next, {
      language,
    });
    setItems(r.items);
    setReserved(r.reserved || []);
    setPage(next);
    setReport(null);
  }
  useEffect(() => {
    if (view !== "comfort") return;
    router.setParams({ view: "" });
    void Promise.resolve().then(() => run(() => load("list")));
    // Triggered by the explicit journal action; normal room navigation is unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  async function open(id: string, claim = false) {
    const r = await confessionAPI(claim ? "open" : "read", { id });
    if (detail?.id !== id) setDraft("");
    setDetail(r.item);
    setReply(r.reply);
    setPage("detail");
    setReport(null);
  }
  const fingerprint = JSON.stringify([
    body,
    audio,
    theme,
    responseType,
    consent,
  ]);
  async function share() {
    if (preview !== fingerprint) return;
    if ((!body.trim() && !audio) || !consent) {
      setError(t("cNeed"));
      return;
    }
    const r = await confessionAPI(
      "share",
      { body, theme, responseType, language, consent },
      audio,
    );
    if (audio) await removeAudio(audio);
    setAudio(undefined);
    setBody("");
    setConsent(false);
    setPreview("");
    setSuccess("share");
    setSupport(r.supportSuggested);
    setPage("success");
  }
  const btn = (key: string, onPress: () => void, quiet = false) => (
    <Button
      title={t(key)}
      disabled={busy || view === "review" || recording || entering}
      onPress={onPress}
      secondary={quiet}
    />
  );
  const status = (x: Confession) => (
    <Text style={s.status}>
      {t(
        x.status === "pending"
          ? x.kind === "reply"
            ? "cReplyPending"
            : "cPending"
          : x.status === "reported"
            ? "cReported"
            : x.status === "rejected"
              ? "cRejected"
              : x.closed
                ? "cClosed"
                : "cApproved",
      )}
    </Text>
  );
  const meta = (x: Pick<Confession, "theme" | "responseType">) => (
    <View style={s.tags}>
      <Text style={s.tag}>{t("c_" + x.theme)}</Text>
      <Text style={s.tag}>{t("c_" + x.responseType)}</Text>
    </View>
  );
  const card = (x: Confession) => (
    <Card>
      {meta(x)}
      {!!x.body && (
        <Text selectable style={s.confession}>
          {x.body}
        </Text>
      )}
      {x.hasAudio && <ConfessionAudio id={x.id} language={language} />}
      <View>{status(x)}</View>
      {page === "review" && (
        <Body small>
          {x.signals?.join(" · ") || "Routine review"} · {x.priority}
        </Body>
      )}
    </Card>
  );
  function remove() {
    const action = () =>
      void run(async () => {
        await confessionAPI("delete", { id: detail!.id });
        await load("mine");
      });
    if (Platform.OS === "web") {
      if (window.confirm(t("cDeleteConfirm"))) action();
    } else
      Alert.alert(t("cDelete"), t("cDeleteConfirm"), [
        { text: t("cancel"), style: "cancel" },
        { text: t("cDelete"), style: "destructive", onPress: action },
      ]);
  }
  return (
    <>
      <StatusBar
        style={
          page === "share" || (page === "room" && strip) ? "light" : "dark"
        }
      />
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={entering}
        importantForAccessibility={entering ? "no-hide-descendants" : "auto"}
        aria-hidden={entering}
      >
        <SurfaceTheme palette={page === "share" ? room : null}>
          <Screen
            quiet={page === "share"}
            keyboardAware={page === "share"}
            place={page === "room" ? "confession" : undefined}
          >
            {page !== "room" && (
              <TextAction
                title={t("cBack")}
                icon="arrow-back"
                disabled={busy || view === "review" || recording}
                onPress={() => {
                  setEntering(false);
                  setPage("room");
                  setReport(null);
                }}
              />
            )}
            {!backend && (
              <Text style={[s.note, page === "share" && { color: room.muted }]}>
                {t("cOffline")}
              </Text>
            )}
            {!!error && <Notice text={error} />}
            {needsSignIn && (
              <Button
                title={tr("Sign in")}
                onPress={() => router.push("/sign-in")}
              />
            )}
            {(busy || view === "review") && (
              <Text
                accessibilityLiveRegion="polite"
                style={[s.note, page === "share" && { color: room.muted }]}
              >
                {t("cLoading")}
              </Text>
            )}
            {page === "room" && (
              <>
                <View style={{ gap: 10, paddingTop: 4, paddingBottom: 8 }}>
                  <Text accessibilityRole="header" style={s.title}>
                    {t("confession")}
                  </Text>
                  <Body>{d("confessionIntro")}</Body>
                </View>
                <View style={{ gap: 0 }}>
                  <ActionCard
                    title={t(body.trim() || audio ? "cReturnDraft" : "cShare")}
                    description={d("shareHint")}
                    icon="create-outline"
                    variant="row"
                    disabled={busy || view === "review" || recording}
                    onPress={startEntrance}
                  />
                  <ActionCard
                    title={t("cOffer")}
                    description={d("comfortHint")}
                    variant="row"
                    icon="ear-outline"
                    disabled={busy || view === "review" || recording}
                    onPress={() => void run(() => load("list"))}
                  />
                  <TextAction
                    title={t("cMine")}
                    icon="mail-open-outline"
                    disabled={busy}
                    onPress={() => void run(() => load("mine"))}
                  />
                </View>
                <View style={{ marginTop: 12, gap: 4 }}>
                  <Disclosure title={d("aboutSpace")}>
                    <Body small>{d("peerSupport")}</Body>
                    <Body small>{t("cDisclaimer")}</Body>
                  </Disclosure>
                </View>
              </>
            )}
            {page === "share" && (
              <>
                <ConfessionLattice />
                <View style={{ gap: 10 }}>
                  <Text
                    accessibilityRole="header"
                    style={[s.title, { color: room.ink }]}
                  >
                    {tr("Begin wherever you are.")}
                  </Text>
                  <Body small>{d("audienceSummary")}</Body>
                  <Disclosure
                    title={t("cAudienceDetails")}
                    open={audienceDetailsOpen}
                    onToggle={() =>
                      setAudienceDetailsOpen(!audienceDetailsOpen)
                    }
                  >
                    <Body small>{t("cAudience")}</Body>
                    <Body small>{t("cOneReply")}</Body>
                  </Disclosure>
                </View>
                <View style={{ gap: 8 }}>
                  <Field
                    label={t("cBody")}
                    hideLabel
                    value={body}
                    onChangeText={setBody}
                    multiline
                    maxLength={3000}
                    placeholder={tr("I’ve been carrying…")}
                    style={{ minHeight: 220, lineHeight: 26 }}
                  />
                  {Platform.OS !== "web" && (
                    <Disclosure
                      title={tr("Record instead")}
                      open={audioOpen || recording || !!audio}
                      onToggle={() => setAudioOpen(!audioOpen)}
                      disabled={recording || !!audio}
                    >
                      <Body small>{t("cAudioNotice")}</Body>
                      <Recorder
                        language={language}
                        value={audio}
                        onChange={setAudio}
                        onBusyChange={setRecording}
                      />
                      {audio && (
                        <>
                          <AudioPlayback id={audio} language={language} />
                          <TextAction
                            title={t("cTextInstead")}
                            icon="create-outline"
                            onPress={() => {
                              void removeAudio(audio).then(() => {
                                setAudio(undefined);
                                setTextInstead(true);
                              });
                            }}
                          />
                        </>
                      )}
                      {textInstead && <Body small>{t("cTextHelp")}</Body>}
                    </Disclosure>
                  )}
                </View>
                <View>
                  <Disclosure
                    title={t("cTheme")}
                    summary={t("c_" + theme)}
                    open={themeOpen}
                    onToggle={() => setThemeOpen(!themeOpen)}
                  >
                    <Row>
                      {themes.map((k) => (
                        <Chip
                          key={k}
                          title={t("c_" + k)}
                          selected={theme === k}
                          onPress={() => {
                            setTheme(k);
                            setThemeOpen(false);
                          }}
                        />
                      ))}
                    </Row>
                  </Disclosure>
                  <Disclosure
                    title={t("cResponse")}
                    summary={t("c_" + responseType)}
                    open={responseOpen}
                    onToggle={() => setResponseOpen(!responseOpen)}
                  >
                    <Row>
                      {responses.map((k) => (
                        <Chip
                          key={k}
                          title={t("c_" + k)}
                          selected={responseType === k}
                          onPress={() => {
                            setResponseType(k);
                            setResponseOpen(false);
                          }}
                        />
                      ))}
                    </Row>
                  </Disclosure>
                </View>
                <View style={{ gap: 8 }}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={t("cConsent")}
                    accessibilityState={{ checked: consent }}
                    onPress={() => setConsent(!consent)}
                    style={s.check}
                  >
                    <Ionicons
                      name={consent ? "checkbox" : "square-outline"}
                      size={25}
                      color={room.ink}
                      accessible={false}
                    />
                    <Text style={s.consent}>{t("cConsent")}</Text>
                  </Pressable>
                  <Button
                    title={tr("Preview confession")}
                    disabled={busy || recording}
                    onPress={() => {
                      if ((!body.trim() && !audio) || !consent) {
                        setError(t("cNeed"));
                        return;
                      }
                      setError("");
                      setPreview(fingerprint);
                    }}
                  />
                  {preview === fingerprint && (
                    <Card>
                      <Body small>{d("audienceSummary")}</Body>
                      {!!body.trim() && <Body>{body.trim()}</Body>}
                      {!!audio && (
                        <AudioPlayback id={audio} language={language} />
                      )}
                      <Body small>
                        {t("c_" + theme)} · {t("c_" + responseType)}
                      </Body>
                      {btn("cSubmit", () => void run(share))}
                      <TextAction
                        title={tr("Edit confession")}
                        icon="create-outline"
                        disabled={busy}
                        onPress={() => setPreview("")}
                      />
                    </Card>
                  )}
                </View>
              </>
            )}
            {page === "success" && (
              <>
                <Text style={s.title}>
                  {t(success === "reply" ? "cReplySent" : "cSuccess")}
                </Text>
                {success !== "reply" && (
                  <Text style={s.intro}>{t("cAfter")}</Text>
                )}
                <Text style={s.note}>
                  {t(success === "reply" ? "cReplyPending" : "cPending")}
                </Text>
                {support && <Text style={s.note}>{t("cSupport")}</Text>}
                {btn("cMine", () => void run(() => load("mine")))}
              </>
            )}
            {page === "list" && (
              <>
                <Text style={s.title}>{t("cChoose")}</Text>
                <Text style={s.intro}>{t("cChooseSub")}</Text>
                {reserved.map((x) => (
                  <Card key={x.id}>
                    {meta(x)}
                    <Body small>
                      {t("cReserved")}{" "}
                      {new Date(x.reservedUntil!).toLocaleString(language)}
                    </Body>
                    {btn("cResume", () => void run(() => open(x.id)))}
                  </Card>
                ))}
                {items.length ? (
                  items.map((x) => (
                    <Pressable
                      key={x.id}
                      accessibilityRole="button"
                      onPress={() => void run(() => open(x.id, true))}
                    >
                      <Card>
                        {meta(x)}
                        <Text style={s.status}>
                          {t(x.hasAudio ? "cAudio" : "cBody")} ↗
                        </Text>
                      </Card>
                    </Pressable>
                  ))
                ) : (
                  <Text style={s.note}>{t("cEmpty")}</Text>
                )}
                {btn("cRefresh", () => void run(() => load("list")), true)}
              </>
            )}
            {page === "mine" && (
              <>
                <Text style={s.title}>{t("cMine")}</Text>
                {items.length ? (
                  items.map((x) => (
                    <Pressable
                      key={x.id}
                      accessibilityRole="button"
                      onPress={() => void run(() => open(x.id))}
                    >
                      <Card>
                        {meta(x)}
                        <Text style={s.subheading}>
                          {t(x.kind === "reply" ? "cOffer" : "cShare")}
                        </Text>
                        {status(x)}
                        {x.thanked && <Body small>{t("cReceivedThanks")}</Body>}
                      </Card>
                    </Pressable>
                  ))
                ) : (
                  <Text style={s.note}>{t("cNoMine")}</Text>
                )}
                {btn("cRefresh", () => void run(() => load("mine")), true)}
              </>
            )}
            {page === "detail" && detail && (
              <>
                {card(detail)}
                {detail.mine && detail.kind === "confession" ? (
                  <>
                    {!detail.closed &&
                      btn(
                        "cClose",
                        () =>
                          void run(async () => {
                            await confessionAPI("close", { id: detail.id });
                            await open(detail.id);
                          }),
                        true,
                      )}
                    {btn("cDelete", remove, true)}
                    {reply && (
                      <>
                        {card(reply)}
                        {reply.status === "approved" && (
                          <>
                            {!reply.thanked ? (
                              btn(
                                "cThank",
                                () =>
                                  void run(async () => {
                                    await confessionAPI("thank", {
                                      id: reply.id,
                                    });
                                    await open(detail.id);
                                  }),
                              )
                            ) : (
                              <Text style={s.note}>{t("cThanked")}</Text>
                            )}
                            {btn("cReport", () => setReport(reply.id), true)}
                            {btn(
                              "cBlock",
                              () =>
                                void run(async () => {
                                  await confessionAPI("block", {
                                    id: reply.id,
                                  });
                                  setError(t("cBlocked"));
                                }),
                              true,
                            )}
                          </>
                        )}
                      </>
                    )}
                  </>
                ) : !detail.mine && detail.kind === "confession" ? (
                  <>
                    <Text style={s.note}>
                      {t("cReserved")}{" "}
                      {new Date(detail.reservedUntil!).toLocaleString(language)}
                      {"\n"}
                      {t("cReservedNote")}
                    </Text>
                    <Card>
                      <Text style={s.subheading}>{t("cListen")}</Text>
                      <Body>{t("cListenSub")}</Body>
                      <Field
                        label={t("cReplyLabel")}
                        value={draft}
                        onChangeText={setDraft}
                        multiline
                        maxLength={3000}
                      />
                      {btn(
                        "cOffer",
                        () =>
                          void run(async () => {
                            if (draft.trim().length < 3) {
                              setError(t("cNeed"));
                              return;
                            }
                            const r = await confessionAPI("reply", {
                              id: detail.id,
                              body: draft,
                              theme: detail.theme,
                              responseType: detail.responseType,
                              language: detail.language,
                              consent: true,
                            });
                            setDraft("");
                            setSuccess("reply");
                            setSupport(r.supportSuggested);
                            setPage("success");
                          }),
                      )}
                    </Card>
                    {btn("cReport", () => setReport(detail.id), true)}
                    {btn(
                      "cBlock",
                      () =>
                        void run(async () => {
                          await confessionAPI("block", { id: detail.id });
                          await load("list");
                          setError(t("cBlocked"));
                        }),
                      true,
                    )}
                  </>
                ) : null}
              </>
            )}
            {report && (
              <Card>
                <Text style={s.subheading}>{t("cReportTitle")}</Text>
                {["unkind", "pressure", "danger", "privacy", "other"].map(
                  (k) => (
                    <Button
                      key={k}
                      secondary
                      title={t("c_" + k)}
                      onPress={() =>
                        void run(async () => {
                          await confessionAPI("report", {
                            id: report,
                            reason: k,
                          });
                          await load("mine");
                          setError(t("cReported"));
                        })
                      }
                    />
                  ),
                )}
                <Button
                  secondary
                  title={t("cancel")}
                  onPress={() => setReport(null)}
                />
              </Card>
            )}
            {page === "review" && (
              <>
                <Text style={s.title}>{t("cReview")}</Text>
                <Text style={s.intro}>{t("cReviewIntro")}</Text>
                <Text style={s.note}>{t("cSupport")}</Text>
                {items.map((x) => (
                  <View key={x.id}>
                    {card(x)}
                    <Card>
                      <Field
                        label={t("cNote")}
                        value={notes[x.id] || ""}
                        onChangeText={(value) =>
                          setNotes((n) => ({ ...n, [x.id]: value }))
                        }
                      />
                      {["approved", "rejected"].map((decision) => (
                        <Button
                          key={decision}
                          secondary
                          title={t(
                            decision === "approved" ? "cApprove" : "cReject",
                          )}
                          onPress={() =>
                            void run(async () => {
                              await confessionAPI("moderate", {
                                id: x.id,
                                decision,
                                note: notes[x.id] || "",
                              });
                              await load("review");
                            })
                          }
                        />
                      ))}
                    </Card>
                  </View>
                ))}
                {btn("cRefresh", () => void run(() => load("review")), true)}
              </>
            )}
          </Screen>
        </SurfaceTheme>
      </View>
      {entering && (
        <ConfessionArrival onEntered={enterRoom} onCancel={cancelEntrance} />
      )}
    </>
  );
}
const s = StyleSheet.create({
  title: { ...sharedStyles.heading },
  intro: { ...sharedStyles.body },
  subheading: { ...sharedStyles.subheading, color: colors.cardInk },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tag: {
    color: colors.cardInk,
    fontSize: 12,
    lineHeight: 18,
    borderWidth: 1,
    borderColor: colors.cardLine,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  status: { color: colors.cardMuted, fontSize: 13, lineHeight: 20 },
  confession: {
    fontFamily: Platform.OS === "android" ? "serif" : "Georgia",
    color: colors.cardInk,
    fontSize: 22,
    lineHeight: 36,
  },
  note: { color: colors.muted, fontSize: 13, lineHeight: 22 },
  check: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingVertical: 12,
    minHeight: 49,
  },
  consent: { flex: 1, fontSize: 13, lineHeight: 22, color: room.ink },
});
