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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../lib/state";
import { roomCopy } from "../../lib/burden-copy";
import { copy } from "../../lib/content";
import { isProtestant } from "../../lib/church-calendar";
import { backend } from "../../lib/backend";
import { confessionAPI, Confession } from "../../lib/confession";
import { confessionReviewNote } from "../../lib/confession-review";
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
import { jc } from "../../lib/journal-copy";
import { journalReturnId } from "../../lib/journal-navigation";
import Recorder from "../../components/Recorder";
import AudioPlayback from "../../components/AudioPlayback";
import ConfessionAudio from "../../components/ConfessionAudio";
import ConfessionArrival, {
  ConfessionBackground,
  ConfessionLattice,
} from "../../components/ConfessionArrival";
import { confessionColors as room } from "../../lib/confession-theme";
import { communityCopy } from "../../lib/community-copy";
import PreviewDialog from "../../components/PreviewDialog";
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
const reviewMessages = {
  en: { self: "Another moderator must review your own submission.", forbidden: "This account cannot moderate. Sign in with an authorized moderator account.", note: "Add a review note of at least five characters.", noteLabel: "Review note (optional when approving)" },
  pt: { self: "Outro moderador precisa revisar seu próprio envio.", forbidden: "Esta conta não pode moderar. Entre com uma conta de moderador autorizada.", note: "Adicione uma nota de revisão com pelo menos cinco caracteres.", noteLabel: "Nota da revisão (opcional para aprovar)" },
  es: { self: "Otro moderador debe revisar tu propio envío.", forbidden: "Esta cuenta no puede moderar. Inicia sesión con una cuenta de moderador autorizada.", note: "Añade una nota de revisión de al menos cinco caracteres.", noteLabel: "Nota de revisión (opcional al aprobar)" },
  ru: { self: "Ваше сообщение должен проверить другой модератор.", forbidden: "У этого аккаунта нет доступа к модерации. Войдите как модератор.", note: "Добавьте заметку о проверке не короче пяти символов.", noteLabel: "Заметка о проверке (при одобрении необязательна)" },
};
const confessionAICopy = {
  en: {
    text: "I agree to send my words to an external AI service for a safety check.",
    audio: "I agree to send my words and recording to an external AI service for a safety check. Audio will be transcribed.",
    more: "How AI review works", less: "Hide AI review details",
    details: "With Community AI enabled, your submission is sent to Alibaba Cloud for a safety check and may be checked again later. Without permission, or if the check is uncertain, a moderator reviews it.",
    pending: "Your submission was sent. Check your submissions for the latest status.",
  },
  pt: {
    text: "Concordo em enviar minhas palavras a um serviço externo de IA para uma verificação de segurança.",
    audio: "Concordo em enviar minhas palavras e gravação a um serviço externo de IA para uma verificação de segurança. O áudio será transcrito.",
    more: "Como funciona a revisão por IA", less: "Ocultar detalhes da revisão por IA",
    details: "Com a IA da comunidade ativada, seu envio é encaminhado à Alibaba Cloud para uma verificação de segurança e poderá ser verificado novamente depois. Sem sua permissão, ou se houver dúvida, um moderador fará a revisão.",
    pending: "Seu envio foi recebido. Veja o status mais recente nos seus envios.",
  },
  es: {
    text: "Acepto enviar mis palabras a un servicio externo de IA para una revisión de seguridad.",
    audio: "Acepto enviar mis palabras y grabación a un servicio externo de IA para una revisión de seguridad. El audio se transcribirá.",
    more: "Cómo funciona la revisión con IA", less: "Ocultar detalles de la revisión con IA",
    details: "Con la IA de la comunidad activada, tu envío se comparte con Alibaba Cloud para una revisión de seguridad y puede revisarse de nuevo más adelante. Sin permiso, o si hay dudas, lo revisará un moderador.",
    pending: "Tu envío se recibió. Consulta su estado más reciente en tus envíos.",
  },
  ru: {
    text: "Я согласен отправить свои слова внешнему сервису ИИ для проверки безопасности.",
    audio: "Я согласен отправить свои слова и запись внешнему сервису ИИ для проверки безопасности. Аудио будет расшифровано.",
    more: "Как работает проверка ИИ", less: "Скрыть подробности проверки ИИ",
    details: "При включённом ИИ сообщества сообщение отправляется в Alibaba Cloud для проверки безопасности и может быть проверено повторно. Без разрешения или при сомнениях его проверит модератор.",
    pending: "Ваше сообщение отправлено. Актуальный статус можно посмотреть в своих сообщениях.",
  },
};

function AIReviewConsent({ language, checked, onToggle, hasAudio = false }: {
  language: keyof typeof confessionAICopy;
  checked: boolean;
  onToggle: () => void;
  hasAudio?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const content = confessionAICopy[language];
  const label = hasAudio ? content.audio : content.text;
  return (
    <View>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked }} onPress={onToggle} style={s.check}>
        <Ionicons name={checked ? "checkbox" : "square-outline"} size={25} color={room.ink} accessible={false} />
        <Text style={s.consent}>{label}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={s.aiDetailsButton}>
        <Text style={s.aiDetailsLink}>{expanded ? content.less : content.more}</Text>
      </Pressable>
      {expanded && <Text style={s.aiDetails}>{content.details}</Text>}
    </View>
  );
}
export default function ConfessionRoom() {
  const tr = useInterfaceCopy();
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const { profile, entries } = useApp(),
    language = profile.language,
    protestant = isProtestant(profile),
    t = (key: string) => roomCopy(language, key, protestant);
  const navigation = useNavigation();
  const { view, returnEntry } = useLocalSearchParams<{
    view?: string;
    returnEntry?: string;
  }>();
  const journalReturn = journalReturnId(returnEntry, entries);
  const d = (key: Parameters<typeof designCopy>[1]) =>
    designCopy(language, key);
  const [themeOpen, setThemeOpen] = useState(false),
    [responseOpen, setResponseOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [preview, setPreview] = useState("");
  const [page, setPage] = useState<Page>("room"),
    [entering, setEntering] = useState(false),
    [body, setBody] = useState(""),
    [theme, setTheme] = useState(""),
    [responseType, setResponseType] = useState("listen"),
    [consent, setConsent] = useState(false),
    [audienceDetailsOpen, setAudienceDetailsOpen] = useState(false),
    [audio, setAudio] = useState<string>(),
    [aiModerationConsent, setAIModerationConsent] = useState(false),
    [replyAIConsent, setReplyAIConsent] = useState(false),
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
    [blockTarget, setBlockTarget] = useState<string | null>(null),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [success, setSuccess] = useState("share"),
    [successItem, setSuccessItem] = useState<Confession | null>(null),
    [support, setSupport] = useState(false);
  const successId = successItem?.id;
  const successStatus = successItem?.status;
  useEffect(() => {
    if (page !== "success" || !successId || successStatus !== "pending") return;
    const id = successId;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    async function checkStatus() {
      try {
        const result = await confessionAPI("read", { id });
        if (cancelled) return;
        if (result.item && result.item.status !== "pending") {
          setSuccessItem((current) => current?.id === id ? result.item : current);
          return;
        }
      } catch {
        // The saved submission remains available in My confessions.
      }
      if (!cancelled && ++attempts < 12) timer = setTimeout(checkStatus, 5000);
    }
    timer = setTimeout(checkStatus, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [page, successId, successStatus]);
  // The first page opens with its corner of the church across the top.
  const enterRoom = useCallback(
    (record = false) => {
      setAudioOpen(record);
      setEntering(false);
      setPage("share");
    },
    [setPage],
  );
  const cancelEntrance = useCallback(() => {
    setEntering(false);
    setPage("room");
  }, [setPage]);
  useFocusEffect(
    useCallback(
      () => () => {
        setEntering(false);
        (
          navigation.setParams as unknown as (params: {
            returnEntry?: string;
          }) => void
        )({ returnEntry: undefined });
      },
      [navigation],
    ),
  );
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
          : { backgroundColor: colors.night, borderTopColor: "#FFFFFF14" },
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
    if (busy || recording || (view === "review" && page !== "review")) return;
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
      if (page === "review" && (msg === "self_review" || msg === "forbidden")) {
        setError(reviewMessages[language][msg === "self_review" ? "self" : "forbidden"]);
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
    setBlockTarget(null);
  }
  // "Offer comfort" opens its page at once and fills it when the list
  // arrives, so the tap is answered straight away. If the list cannot be
  // fetched, the room comes back with the reason.
  function offerComfort() {
    if (busy || recording || view === "review") return;
    setItems([]);
    setReserved([]);
    setReport(null);
    setPage("list");
    void run(async () => {
      try {
        await load("list");
      } catch (e) {
        setPage("room");
        throw e;
      }
    });
  }
  useEffect(() => {
    if (view !== "comfort") return;
    router.setParams({ view: "" });
    void Promise.resolve().then(offerComfort);
    // Triggered by the explicit journal action; normal room navigation is unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  useEffect(() => {
    if (view !== "mine") return;
    router.setParams({ view: "" });
    void Promise.resolve().then(() => run(() => load("mine")));
    // Load only in response to the explicit notification link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  async function open(id: string, claim = false) {
    const r = await confessionAPI(claim ? "open" : "read", { id });
    if (detail?.id !== id) { setDraft(""); setReplyAIConsent(false); }
    setDetail(r.item);
    setReply(r.reply);
    setPage("detail");
    setReport(null);
    setBlockTarget(null);
  }
  const fingerprint = JSON.stringify([
    body,
    audio,
    aiModerationConsent,
    theme,
    responseType,
    consent,
  ]);
  async function share() {
    if (preview !== fingerprint) return;
    if (!theme) {
      setError(communityCopy(language, "needConfessionTheme"));
      return;
    }
    if ((!body.trim() && !audio) || !consent) {
      setError(t("cNeed"));
      return;
    }
    const r = await confessionAPI(
      "share",
      { body, theme, responseType, language, consent, aiModerationConsent: aiModerationConsent ? "confession-ai-2026-11-16" : null, audioModerationConsent: audio && aiModerationConsent ? "confession-audio-ai-2026-11-16" : null },
      audio,
    );
    if (audio) await removeAudio(audio);
    setAudio(undefined);
    setAIModerationConsent(false);
    setBody("");
    setTheme("");
    setConsent(false);
    setPreview("");
    setSuccess("share");
    setSuccessItem(r.item);
    setSupport(r.supportSuggested);
    setPage("success");
  }
  const btn = (key: string, onPress: () => void, quiet = false) => (
    <Button
      title={t(key)}
      disabled={busy || (view === "review" && page !== "review") || recording || entering}
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
        style="light"
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
            background={page === "room" ? <ConfessionBackground /> : undefined}
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
            {page === "room" && journalReturn && (
              <TextAction
                title={jc(language, "backToJournal")}
                icon="arrow-back"
                disabled={busy || recording || entering}
                onPress={() => {
                  (
                    navigation.setParams as unknown as (params: {
                      returnEntry?: string;
                    }) => void
                  )({ returnEntry: undefined });
                  router.push({
                    pathname: "/entry/[id]",
                    params: { id: journalReturn },
                  });
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
            {(busy || view === "review") && page !== "share" && (
              <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <ActivityIndicator size="small" color={colors.gold} />
                <Text style={s.note}>{page === "list" ? tr("Loading the list…") : t("cLoading")}</Text>
              </View>
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
                    emphasis
                    disabled={busy || view === "review" || recording}
                    onPress={startEntrance}
                  />
                  <ActionCard
                    title={t("cOffer")}
                    description={d("comfortHint")}
                    variant="row"
                    icon="ear-outline"
                    disabled={busy || view === "review" || recording}
                    onPress={offerComfort}
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
                    {!protestant && <Body small>{d("peerSupport")}</Body>}
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
                    <Body small>
                      {communityCopy(language, "responseNotGuaranteed")}
                    </Body>
                  </Disclosure>
                </View>
                {preview !== fingerprint && (
                  <>
                    <View style={{ gap: 8 }}>
                      <Field
                        label={t("cBody")}
                        hideLabel
                        value={body}
                        onChangeText={setBody}
                        multiline
                        maxLength={3000}
                        placeholder={tr("I’ve been carrying…")}
                        style={{
                          minHeight: 220,
                          lineHeight: 26,
                          borderRadius: 18,
                          borderColor: colors.line,
                        }}
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
                            onChange={(value) => { setAudio(value); setAIModerationConsent(false); }}
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
                                    setAIModerationConsent(false);
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
                        summary={
                          theme
                            ? t("c_" + theme)
                            : communityCopy(language, "chooseConfessionTheme")
                        }
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
                      <AIReviewConsent language={language} checked={aiModerationConsent} onToggle={() => setAIModerationConsent(!aiModerationConsent)} hasAudio={!!audio} />
                      <Button
                        title={
                          protestant
                            ? t("previewBurden")
                            : tr("Preview confession")
                        }
                        disabled={busy || recording}
                        onPress={() => {
                          if (!theme) {
                            setThemeOpen(true);
                            setError(
                              communityCopy(language, "needConfessionTheme"),
                            );
                            return;
                          }
                          if ((!body.trim() && !audio) || !consent) {
                            setError(t("cNeed"));
                            return;
                          }
                          setError("");
                          setPreview(fingerprint);
                        }}
                      />
                    </View>
                  </>
                )}
                <PreviewDialog visible={preview === fingerprint} busy={busy} onClose={() => setPreview("")} closeLabel={tr("Close preview")}>
                    <Text accessibilityRole="header" style={s.title}>{protestant ? t("previewBurden") : tr("Preview confession")}</Text>
                    <Notice text={error} />
                    <Body small>{d("audienceSummary")}</Body>
                    <Body small>
                      {communityCopy(language, "responseNotGuaranteed")}
                    </Body>
                    {!!body.trim() && <Body>{body.trim()}</Body>}
                    {!!audio && (
                      <AudioPlayback id={audio} language={language} />
                    )}
                    <Body small>
                      {t("c_" + theme)} · {t("c_" + responseType)}
                    </Body>
                    <Button title={busy ? tr("Sending…") : t("cSubmit")} disabled={busy} loading={busy} onPress={() => void run(share)} />
                    <TextAction
                      title={
                        protestant ? t("editBurden") : tr("Edit confession")
                      }
                      icon="create-outline"
                      disabled={busy}
                      onPress={() => setPreview("")}
                    />
                </PreviewDialog>
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
                  {successItem && successItem.status !== "pending"
                    ? t(successItem.status === "approved" ? "cApproved" : successItem.status === "reported" ? "cReported" : "cRejected")
                    : confessionAICopy[language].pending}
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
                ) : busy ? null : (
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
                              () => setBlockTarget(reply.id),
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
                      <AIReviewConsent language={language} checked={replyAIConsent} onToggle={() => setReplyAIConsent(!replyAIConsent)} />
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
                              aiModerationConsent: replyAIConsent ? "confession-ai-2026-11-16" : null,
                            });
                            setDraft("");
                            setReplyAIConsent(false);
                            setSuccess("reply");
                            setSuccessItem(r.item);
                            setSupport(r.supportSuggested);
                            setPage("success");
                          }),
                      )}
                    </Card>
                    {btn("cReport", () => setReport(detail.id), true)}
                    {btn("cBlock", () => setBlockTarget(detail.id), true)}
                  </>
                ) : null}
              </>
            )}
            {blockTarget && (
              <Card>
                <Body>{tr("Block this person? You will no longer be matched in this room.")}</Body>
                <Button title={tr("Block")} disabled={busy} onPress={() => void run(async () => {
                  const target = blockTarget;
                  await confessionAPI("block", { id: target });
                  setBlockTarget(null);
                  if (!detail?.mine) {
                    setDraft("");
                    await load("list");
                  }
                  setError(t("cBlocked"));
                })} />
                <Button secondary title={tr("Cancel")} disabled={busy} onPress={() => setBlockTarget(null)} />
              </Card>
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
                        label={reviewMessages[language].noteLabel}
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
                              const note = confessionReviewNote(decision, notes[x.id] || "");
                              if (!note) {
                                setError(reviewMessages[language].note);
                                return;
                              }
                              await confessionAPI("moderate", {
                                id: x.id,
                                decision,
                                note,
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
  aiDetailsButton: { alignSelf: "flex-start", paddingLeft: 35, paddingVertical: 6, minHeight: 36, justifyContent: "center" },
  aiDetailsLink: { color: room.muted, fontSize: 12, textDecorationLine: "underline" },
  aiDetails: { color: room.muted, fontSize: 12, lineHeight: 20, paddingLeft: 35, paddingBottom: 10 },
});
