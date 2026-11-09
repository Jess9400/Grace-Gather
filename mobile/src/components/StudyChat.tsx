import { useRef, useState, useEffect } from "react";
import { router } from "expo-router";
import { Body, Button, Card, Field, Notice } from "./quiet-ui";
import { useApp } from "../lib/state";
import { requireUser } from "../lib/backend";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { setStudyDiscussionTopic } from "../lib/study-discussion-draft";
type Message = { role: "user" | "assistant"; content: string };
export default function StudyChat({
  initialQuestion = "",
}: {
  initialQuestion?: string;
}) {
  const { profile } = useApp(),
    tr = useInterfaceCopy();
  const [question, setQuestion] = useState(initialQuestion),
    [messages, setMessages] = useState<Message[]>([]);
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const active = useRef(true),
    working = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function ask() {
    if (working.current || !consent || !question.trim()) return;
    working.current = true;
    setBusy(true);
    setError("");
    const text = question.trim();
    const next: Message[] = [
      ...messages.slice(-6),
      { role: "user", content: text },
    ];
    try {
      const { client } = await requireUser();
      const { data, error } = await client.functions.invoke("bible-study", {
        body: {
          messages: next,
          consent: "study-qwen-v1",
          preferences: {
            language: profile.language,
            scriptureLanguage: profile.scriptureLanguage,
            tradition: profile.tradition,
            edition: profile.edition,
          },
        },
      });
      if (
        error ||
        typeof data?.answer !== "string" ||
        data.edition !== profile.edition
      )
        throw Error("unavailable");
      if (active.current) {
        setMessages([...next, { role: "assistant", content: data.answer }]);
        setQuestion("");
      }
    } catch {
      if (active.current)
        setError(
          tr(
            "Study AI is unavailable. Sign in or try again shortly. Your question is still here.",
          ),
        );
    } finally {
      working.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <Card>
      <Body>{tr("Discuss with AI")}</Body>
      {!consent && (
        <>
          <Body small>
            {tr(
              "Send your questions and Bible preferences to Alibaba Qwen for study help. AI can make mistakes; check the passages. This conversation is not published.",
            )}
          </Body>
          <Button
            secondary
            title={tr("Enable study AI")}
            onPress={() => setConsent(true)}
          />
        </>
      )}
      {messages.map((m, i) => (
        <Card key={i}>
          <Body small>{tr(m.role === "user" ? "You" : "AI study guide")}</Body>
          <Body>{m.content}</Body>
        </Card>
      ))}
      <Field
        label={tr("Your Bible question")}
        multiline
        value={question}
        onChangeText={setQuestion}
        maxLength={3000}
      />
      <Notice text={error} />
      <Button
        title={tr(busy ? "Thinking…" : "Ask study AI")}
        disabled={!consent || busy || !question.trim()}
        onPress={() => void ask()}
      />
      {!!messages.length && (
        <Button
          secondary
          title={tr("Start a discussion about this topic")}
          onPress={() => {
            setStudyDiscussionTopic(
              messages.filter((m) => m.role === "user").at(-1)?.content ?? "",
            );
            router.push({
              pathname: "/community",
              params: { compose: "1" },
            });
          }}
        />
      )}
    </Card>
  );
}
