import { useEffect, useState } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../../lib/state";
import { copy } from "../../lib/content";
import { backend } from "../../lib/backend";
import { confessionAPI, Confession } from "../../lib/confession";
import { removeAudio } from "../../lib/storage";
import { Button, Body, Field, Notice, Row, Chip } from "../../components/ui";
import Recorder from "../../components/Recorder";
import AudioPlayback from "../../components/AudioPlayback";
import ConfessionAudio from "../../components/ConfessionAudio";
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
  const [page, setPage] = useState<Page>("room"),
    [body, setBody] = useState(""),
    [theme, setTheme] = useState("loneliness"),
    [responseType, setResponseType] = useState("listen"),
    [consent, setConsent] = useState(false),
    [audio, setAudio] = useState<string>(),
    [recording, setRecording] = useState(false),
    [textInstead, setTextInstead] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [moderator, setModerator] = useState(false),
    [items, setItems] = useState<Confession[]>([]),
    [reserved, setReserved] = useState<Confession[]>([]),
    [detail, setDetail] = useState<Confession | null>(null),
    [reply, setReply] = useState<Confession | null>(null),
    [draft, setDraft] = useState(""),
    [report, setReport] = useState<string | null>(null),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [success, setSuccess] = useState("share"),
    [support, setSupport] = useState(false);
  useEffect(() => {
    let active = true;
    if (backend)
      void confessionAPI("status")
        .then((r) => {
          if (active) setModerator(r.moderator);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  async function run(fn: () => Promise<void>) {
    if (busy || recording) return;
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
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy || recording }}
      disabled={busy || recording}
      onPress={onPress}
      style={[s.button, quiet && s.quiet]}
    >
      <Text style={[s.buttonText, quiet && s.ivory]}>{t(key)}</Text>
    </Pressable>
  );
  const status = (x: Confession) => (
    <Text style={s.status}>
      {t(
        x.status === "pending"
          ? (x.kind === "reply" ? "cReplyPending" : "cPending")
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
    <View style={s.paper}>
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
    </View>
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
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.page}
      >
        <Text style={s.brand}>GRACE & GATHER</Text>
        {page !== "room" &&
          btn(
            "cBack",
            () => {
              setPage("room");
              setReport(null);
            },
            true,
          )}
        {!backend && <Text style={s.note}>{t("cOffline")}</Text>}
        {!!error && <Notice text={error} />}{" "}
        {busy && (
          <Text accessibilityLiveRegion="polite" style={s.note}>
            {t("cLoading")}
          </Text>
        )}
        {page === "room" && (
          <>
            <View style={s.entrance}>
              <Text style={s.lattice} accessibilityElementsHidden>
                ╳╳{"\n"}╳╳
              </Text>
              <Text style={s.eyebrow}>{t("confession")}</Text>
              <Text accessibilityRole="header" style={s.title}>
                {t("cTitle")}
              </Text>
              <Text style={s.intro}>{t("cIntro")}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPage("share")}
              style={s.door}
            >
              <Text style={s.doorTitle}>{t("cShare")} ↗</Text>
              <Text style={s.doorBody}>{t("cShareSub")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void run(() => load("list"))}
              style={[s.door, s.doorDark]}
            >
              <Text style={[s.doorTitle, s.ivory]}>{t("cOffer")} ↗</Text>
              <Text style={[s.doorBody, s.ivory]}>{t("cOfferSub")}</Text>
            </Pressable>
            <Text style={s.disclaimer}>{t("cDisclaimer")}</Text>
            {btn("cMine", () => void run(() => load("mine")), true)}
            {moderator &&
              btn("cReview", () => void run(() => load("review")), true)}
          </>
        )}
        {page === "share" && (
          <>
            <Text accessibilityRole="header" style={s.title}>
              {t("cShare")}
            </Text>
            <View style={s.paper}>
              <Text style={s.subheading}>{t("cAudienceTitle")}</Text>
              <Body small>{t("cAudience")}</Body>
              <Body small>{t("cOneReply")}</Body>
              <Text style={s.label}>{t("cTheme")}</Text>
              <Row>
                {themes.map((k) => (
                  <Chip
                    key={k}
                    title={t("c_" + k)}
                    selected={theme === k}
                    onPress={() => setTheme(k)}
                  />
                ))}
              </Row>
              <Text style={s.label}>{t("cResponse")}</Text>
              <Row>
                {responses.map((k) => (
                  <Chip
                    key={k}
                    title={t("c_" + k)}
                    selected={responseType === k}
                    onPress={() => setResponseType(k)}
                  />
                ))}
              </Row>
              <Field
                label={t("cBody")}
                value={body}
                onChangeText={setBody}
                multiline
                maxLength={3000}
                placeholder={t("cPlaceholder")}
              />
              <Text style={s.label}>{t("cAudio")}</Text>
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
                  <Button
                    secondary
                    title={t("cTextInstead")}
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
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: consent }}
                onPress={() => setConsent(!consent)}
                style={s.check}
              >
                <Text style={s.checkMark}>{consent ? "☑" : "□"}</Text>
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
            {success !== "reply" && <Text style={s.intro}>{t("cAfter")}</Text>}
            <Text style={s.note}>{t(success === "reply" ? "cReplyPending" : "cPending")}</Text>
            {support && <Text style={s.note}>{t("cSupport")}</Text>}
            {btn("cMine", () => void run(() => load("mine")))}
          </>
        )}
        {page === "list" && (
          <>
            <Text style={s.title}>{t("cChoose")}</Text>
            <Text style={s.intro}>{t("cChooseSub")}</Text>
            {reserved.map((x) => (
              <View key={x.id} style={s.paper}>
                {meta(x)}
                <Body small>
                  {t("cReserved")}{" "}
                  {new Date(x.reservedUntil!).toLocaleString(language)}
                </Body>
                {btn("cResume", () => void run(() => open(x.id)))}
              </View>
            ))}
            {items.length ? (
              items.map((x) => (
                <Pressable
                  key={x.id}
                  accessibilityRole="button"
                  style={s.paper}
                  onPress={() => void run(() => open(x.id, true))}
                >
                  {meta(x)}
                  <Text style={s.status}>
                    {t(x.hasAudio ? "cAudio" : "cBody")} ↗
                  </Text>
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
                  style={s.paper}
                >
                  {meta(x)}
                  <Text style={s.subheading}>
                    {t(x.kind === "reply" ? "cOffer" : "cShare")}
                  </Text>
                  {status(x)}
                  {x.thanked && <Body small>{t("cReceivedThanks")}</Body>}
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
                                await confessionAPI("thank", { id: reply.id });
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
                              await confessionAPI("block", { id: reply.id });
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
                <View style={s.paper}>
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
                </View>
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
          <View style={s.paper}>
            <Text style={s.subheading}>{t("cReportTitle")}</Text>
            {["unkind", "pressure", "danger", "privacy", "other"].map((k) => (
              <Button
                key={k}
                secondary
                title={t("c_" + k)}
                onPress={() =>
                  void run(async () => {
                    await confessionAPI("report", { id: report, reason: k });
                    await load("mine");
                    setError(t("cReported"));
                  })
                }
              />
            ))}
            <Button
              secondary
              title={t("cancel")}
              onPress={() => setReport(null)}
            />
          </View>
        )}
        {page === "review" && (
          <>
            <Text style={s.title}>{t("cReview")}</Text>
            <Text style={s.intro}>{t("cReviewIntro")}</Text>
            <Text style={s.note}>{t("cSupport")}</Text>
            {items.map((x) => (
              <View key={x.id}>
                {card(x)}
                <View style={s.paper}>
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
                </View>
              </View>
            ))}
            {btn("cRefresh", () => void run(() => load("review")), true)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#211d19" },
  page: {
    padding: 22,
    paddingBottom: 40,
    gap: 16,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  brand: {
    color: "#d8c6ab",
    fontSize: 11,
    letterSpacing: 2.3,
    marginBottom: 12,
  },
  entrance: { alignItems: "center", gap: 20, paddingVertical: 16 },
  lattice: { fontSize: 25, lineHeight: 20, color: "#c9a06b", letterSpacing: 4 },
  eyebrow: {
    color: "#c9a877",
    letterSpacing: 2.5,
    fontSize: 11,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: Platform.OS === "android" ? "serif" : "Georgia",
    color: "#f4ecde",
    fontSize: 36,
    lineHeight: 43,
    letterSpacing: -0.5,
  },
  intro: { color: "#dbcfbe", fontSize: 16, lineHeight: 27 },
  door: {
    backgroundColor: "#eee2ce",
    borderColor: "#bda482",
    borderWidth: 1,
    borderRadius: 19,
    padding: 23,
    gap: 12,
    minHeight: 127,
    justifyContent: "center",
  },
  doorDark: { backgroundColor: "#302820", borderColor: "#796044" },
  doorTitle: {
    fontFamily: Platform.OS === "android" ? "serif" : "Georgia",
    fontSize: 25,
    color: "#342a22",
  },
  doorBody: { fontSize: 14, lineHeight: 23, color: "#42372c" },
  ivory: { color: "#f0e4cf" },
  disclaimer: { fontSize: 12, lineHeight: 21, color: "#c6b6a1", marginTop: 8 },
  button: {
    backgroundColor: "#d9b887",
    borderRadius: 13,
    padding: 15,
    minHeight: 49,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#30251b",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  quiet: { backgroundColor: "transparent" },
  paper: {
    backgroundColor: "#f2e8d7",
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#c5ac87",
    gap: 14,
  },
  subheading: {
    fontFamily: Platform.OS === "android" ? "serif" : "Georgia",
    fontSize: 24,
    lineHeight: 31,
    color: "#352d26",
  },
  label: { color: "#352d26", fontSize: 13, fontWeight: "600", marginTop: 12 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tag: {
    color: "#584632",
    fontSize: 12,
    borderWidth: 1,
    borderColor: "#b09c7f",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  status: { color: "#62513e", fontSize: 12, lineHeight: 20 },
  confession: {
    fontFamily: Platform.OS === "android" ? "serif" : "Georgia",
    color: "#352d26",
    fontSize: 22,
    lineHeight: 36,
  },
  note: { color: "#dcc8a9", fontSize: 13, lineHeight: 22 },
  check: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  checkMark: { fontSize: 25, color: "#624a2e" },
  consent: { flex: 1, fontSize: 13, lineHeight: 22, color: "#463627" },
});
