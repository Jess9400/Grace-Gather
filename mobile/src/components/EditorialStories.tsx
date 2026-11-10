import { useState } from "react";
import * as Crypto from "expo-crypto";
import {
  Screen,
  Heading,
  Subheading,
  Body,
  Field,
  Button,
  Card,
  External,
  Notice,
} from "./community-ui";
import { useApp } from "../lib/state";
import { communityCopy } from "../lib/community-copy";
import { requireUser } from "../lib/backend";

/** Staff publication is enforced by content_items RLS as well as the dashboard. */
export default function EditorialStories() {
  const { profile } = useApp();
  const c = (key: string) => communityCopy(profile.language, key);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const trimmedUrl = url.trim();
  let validUrl = !trimmedUrl;
  try {
    if (trimmedUrl) validUrl = new URL(trimmedUrl).protocol === "https:";
  } catch {
    validUrl = false;
  }
  const valid =
    !!title.trim() &&
    !!source.trim() &&
    !!summary.trim() &&
    validUrl &&
    (!!body.trim() || !!trimmedUrl);
  async function publish() {
    if (!valid || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const { client } = await requireUser();
      const id = `editorial-${Crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const lang = profile.language;
      const story = {
        id,
        type: "stories",
        origin: "editorial",
        source: source.trim(),
        title: { [lang]: title.trim() },
        summary: { [lang]: summary.trim() },
        body: { [lang]: body.trim() || summary.trim() },
        lang,
        tags: [],
        publishedAt: now,
        resources: trimmedUrl ? [["read", source.trim(), trimmedUrl]] : [],
      };
      const result = await client.from("content_items").insert({
        id,
        kind: "feed",
        data: story,
        published: true,
        sort_at: now,
      });
      if (result.error) throw result.error;
      setTitle("");
      setSource("");
      setUrl("");
      setSummary("");
      setBody("");
      setPreview(false);
      setNotice(c("editorialPublished"));
    } catch {
      setNotice(c("actionError"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Heading>{c("editorialStories")}</Heading>
      <Body small>{c("editorialIntro")}</Body>
      <Notice text={notice} />
      {!preview ? (
        <>
          <Field
            label={c("editorialTitle")}
            value={title}
            onChangeText={setTitle}
            maxLength={160}
          />
          <Field
            label={c("editorialSource")}
            value={source}
            onChangeText={setSource}
            maxLength={100}
          />
          <Field
            label={c("editorialUrl")}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            maxLength={2000}
          />
          <Field
            label={c("editorialSummary")}
            value={summary}
            onChangeText={setSummary}
            multiline
            maxLength={1500}
          />
          <Field
            label={c("editorialBody")}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={20000}
          />
          <Button
            title={c("editorialPreview")}
            onPress={() => {
              if (valid) {
                setNotice("");
                setPreview(true);
              } else setNotice(c("editorialInvalid"));
            }}
          />
        </>
      ) : (
        <>
          <Card>
            <Body small>{source.trim()}</Body>
            <Subheading>{title.trim()}</Subheading>
            <Body>{summary.trim()}</Body>
            {!!body.trim() && <Body>{body.trim()}</Body>}
            {!!trimmedUrl && (
              <External title={source.trim()} url={trimmedUrl} />
            )}
          </Card>
          <Button
            title={c("editorialPublish")}
            disabled={busy}
            onPress={() => void publish()}
          />
          <Button
            secondary
            title={c("editorialEdit")}
            disabled={busy}
            onPress={() => setPreview(false)}
          />
        </>
      )}
    </Screen>
  );
}
