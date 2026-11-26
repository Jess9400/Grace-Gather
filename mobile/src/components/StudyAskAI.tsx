import { randomUUID } from "expo-crypto";
import { membershipStatus, requireProAction, upgradeForError } from "../lib/membership";
import membershipCopy from "../lib/membership-copy.json";
import { useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  View,
  TextInput,
  ActivityIndicator,
  type ScrollViewInstance,
} from "react-native";
import { Body, colors } from "./quiet-ui";
import { StudyAction, StudyHeader } from "./StudyControls";
import JournalAIPermissionDialog from "./JournalAIPermissionDialog";
import { useApp } from "../lib/state";
import { requireUser } from "../lib/backend";
import { AI_CONSENT_VERSION } from "../lib/ai-copy";
import { aiRequestError } from "../lib/ai-error";
import { collaborationCopy } from "../lib/study-collaboration-copy";
import type { Language } from "../lib/content";
import type { StepWord } from "../lib/stepbible";
import type { ReadingVerse } from "../lib/bible";
type Message = { role: "user" | "assistant"; content: string };
export default function StudyAskAI({
  verse,
  word,
  language,
  onClose,
}: {
  verse?: ReadingVerse | null;
  word?: StepWord;
  language: Language;
  onClose: () => void;
}) {
  const { profile } = useApp();
  const c = collaborationCopy(language);
  const [messages, setMessages] = useState<Message[]>([]),
    [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [permission, setPermission] = useState(false);
  const inFlight = useRef(false);
  const requestId=useRef<string|null>(null);
  const [allowance,setAllowance]=useState<{studyRemaining:number;studyResetsAt:string}|null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  async function send() {
    if (inFlight.current || !question.trim()) return;
    inFlight.current = true;
    if (!(await requireProAction(() => {}))) { inFlight.current=false; return; }
    if (profile.journalAIConsentVersion !== AI_CONSENT_VERSION) {
      setPermission(true);
      inFlight.current=false;
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(false);
    try {
      const { client } = await requireUser();
      const context = [
        verse
          ? `Selected passage (${verse.reference}; ${verse.editionName}): ${verse.text}`
          : "",
        word
          ? `STEPBible dictionary entry (CC BY 4.0): ${JSON.stringify(word)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      // Context is repeated after truncation so follow-ups retain the actual word and passage.
      const recent = messages.slice(-6);
      const outgoing: Message[] = [
        ...recent,
        {
          role: "user",
          content: `${context.slice(0, 3500)}\nQuestion: ${question.trim()}`,
        },
      ];
      const { data, error: failure } = await client.functions.invoke(
        "bible-study",
        {
          body: {
            requestId: requestId.current ?? (requestId.current=randomUUID()),
            consent: "study-qwen-v1",
            preferences: {
              language,
              scriptureLanguage: profile.scriptureLanguage,
              tradition: profile.tradition,
              edition: profile.edition,
            },
            messages: outgoing,
          },
        },
      );
      if (failure) throw await aiRequestError(failure);
      requestId.current=null;
      void membershipStatus().then(setAllowance).catch(()=>{});
      if (typeof data?.answer !== "string" || !data.answer.trim())
        throw Error("invalid_response");
      setMessages((old) => [
        ...old,
        { role: "user", content: question.trim() },
        { role: "assistant", content: data.answer },
      ]);
      setQuestion("");
    } catch (error) {
      upgradeForError(error);
      setError(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 18,
          backgroundColor: "#0009",
        }}
      >
        <View
          style={{
            maxHeight: "90%",
            width: "100%",
            maxWidth: 680,
            alignSelf: "center",
            backgroundColor: colors.paper,
            borderRadius: 24,
            padding: 22,
            gap: 14,
          }}
        >
          {!!allowance && <Body small>{membershipCopy[language].remaining.replace("{n}", String(allowance.studyRemaining))} · {membershipCopy[language].reset.replace("{date}",new Date(allowance.studyResetsAt).toLocaleString(language,{dateStyle:"medium",timeStyle:"short"}))}</Body>}
          <StudyHeader title={c.askAI} closeLabel="×" onClose={onClose} />
          <ScrollView
            ref={scroll}
            style={{ maxHeight: 400 }}
            onContentSizeChange={() =>
              scroll.current?.scrollToEnd({ animated: true })
            }
            contentContainerStyle={{ gap: 16 }}
          >
            {verse && (
              <Body small>
                {verse.reference} · {verse.editionName}
              </Body>
            )}
            {word && (
              <Body>
                {word.word} · {word.transliteration} · {word.id}
              </Body>
            )}
            <Body small>{c.aiHint}</Body>
            {messages.map((message, index) => (
              <View
                key={index}
                style={{
                  padding: 12,
                  borderLeftWidth: message.role === "assistant" ? 2 : 0,
                  borderColor: colors.gold,
                }}
              >
                <Body>{message.content}</Body>
              </View>
            ))}
            {word && <Body small>{c.source}</Body>}
          </ScrollView>
          <TextInput
            multiline
            value={question}
            onChangeText={(value)=>{requestId.current=null;setQuestion(value);}}
            maxLength={1800}
            placeholder={c.question}
            accessibilityLabel={c.question}
            placeholderTextColor={colors.muted}
            editable={!busy}
            style={{
              color: colors.ink,
              fontSize: 17,
              minHeight: 70,
              maxHeight: 150,
              padding: 14,
              backgroundColor: colors.white,
              borderRadius: 14,
            }}
          />
          {busy && <ActivityIndicator color={colors.goldInk} />}{" "}
          {error && <Body small>{c.error}</Body>}
          <StudyAction
            title={c.send}
            disabled={busy || !question.trim()}
            onPress={() => void send()}
          />
        </View>
      </View>
      <JournalAIPermissionDialog
        visible={permission}
        onClose={() => setPermission(false)}
        onAllowed={() => setPermission(false)}
      />
    </Modal>
  );
}
