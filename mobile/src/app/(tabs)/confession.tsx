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
  AccessibilityInfo,
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
} from "../../components/ui";
import {
  ActionCard,
  Disclosure,
  TextAction,
} from "../../components/QuietControls";
import { designCopy } from "../../lib/design-copy";
import Recorder from "../../components/Recorder";
import AudioPlayback from "../../components/AudioPlayback";
import ConfessionAudio from "../../components/ConfessionAudio";
import ConfessionalDoor from "../../components/ConfessionalDoor";
import { confessionColors as room } from "../../lib/confession-theme";
import { prepareWalnutTexture } from "../../lib/confessional-texture";
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
  const { profile } = useApp(),
    language = profile.language,
    t = (key: string) => copy(language, key);
  const navigation = useNavigation();
  const { view } = useLocalSearchParams<{ view?: string }>();
  const d = (key: Parameters<typeof designCopy>[1]) =>
    designCopy(language, key);
  const [themeOpen, setThemeOpen] = useState(false),
    [responseOpen, setResponseOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
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
  const enterRoom = useCallback(() => {
    setEntering(false);
    setPage("share");
  }, []);
  const cancelEntrance = useCallback(() => {
    setEntering(false);
    setPage("room");
  }, []);
  useFocusEffect(useCallback(() => () => setEntering(false), []));
  function startEntrance() {
    setPage("share");
    setEntering(!reducedMotion);
  }
  useEffect(() => {
    let active = true,
      changed = false;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active && !changed) setReducedMotion(value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        changed = true;
        setReducedMotion(value);
      },
    );
    void prepareWalnutTexture().catch(() => {});
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    navigation.setOptions({
      tabBarHideOnKeyboard: page === "share",
      tabBarStyle:
        page === "share"
          ? { backgroundColor: room.background, borderTopColor: room.line }
          : { backgroundColor: colors.paper, borderTopColor: colors.line },
      tabBarActiveTintColor: page === "share" ? room.accent : colors.green,
      tabBarInactiveTintColor: page === "share" ? room.muted : colors.inactive,
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
    setError("");
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
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
  async function open(id: string, claim = false) {
    const r = await confessionAPI(claim ? "open" : "read", { id });
    if (detail?.id !== id) setDraft("");
    setDetail(r.item);
    setReply(r.reply);
    setPage("detail");
    setReport(null);
  }
  async function share() {
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
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={entering}
        importantForAccessibility={entering ? "no-hide-descendants" : "auto"}
        aria-hidden={entering}
      >
        <SurfaceTheme palette={page === "share" ? room : null}>
          <Screen quiet={page === "share"} keyboardAware={page === "share"}>
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
            {!backend && <Text style={s.note}>{t("cOffline")}</Text>}
            {!!error && <Notice text={error} />}
            {(busy || view === "review") && (
              <Text accessibilityLiveRegion="polite" style={s.note}>
                {t("cLoading")}
              </Text>
            )}
            {page === "room" && (
              <>
                <View style={{ gap: 12, paddingTop: 12, paddingBottom: 10 }}>
                  <Ionicons
                    name="grid-outline"
                    size={25}
                    color={colors.gold}
                    accessible={false}
                  />
                  <Text accessibilityRole="header" style={s.title}>
                    {t("confession")}
                  </Text>
                  <Body>{d("confessionIntro")}</Body>
                </View>
                <View style={{ gap: 12 }}>
                  <ActionCard
                    title={t(body.trim() || audio ? "cReturnDraft" : "cShare")}
                    description={d("shareHint")}
                    icon="create-outline"
                    primary
                    disabled={busy || view === "review" || recording}
                    onPress={startEntrance}
                  />
                  <ActionCard
                    title={t("cOffer")}
                    description={d("comfortHint")}
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
                <View style={{ marginTop: 6, gap: 4 }}>
                  <Body small>{d("peerSupport")}</Body>
                  <Disclosure title={d("aboutSpace")}>
                    <Body small>{t("cDisclaimer")}</Body>
                  </Disclosure>
                </View>
              </>
            )}
            {page === "share" && (
              <>
                <View style={{ gap: 10 }}>
                  <Text
                    accessibilityRole="header"
                    style={[s.title, { color: room.ink }]}
                  >
                    {t("cShare")}
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
                    placeholder={t("cPlaceholder")}
                    style={{ minHeight: 220, lineHeight: 26 }}
                  />
                  {Platform.OS !== "web" && (
                    <Disclosure
                      title={t("cAudio")}
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
                  {btn("cSubmit", () => void run(share))}
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
        <ConfessionalDoor
          language={language}
          onEntered={enterRoom}
          onCancel={cancelEntrance}
        />
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
