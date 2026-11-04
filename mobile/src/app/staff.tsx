import { useCallback, useEffect, useState } from "react";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Button,
  Field,
  Notice,
} from "../components/quiet-ui";
import { requireUser } from "../lib/backend";
interface Comment {
  id: string;
  alias: string;
  body: string;
  user_id: string;
}
interface Report {
  id: string;
  reason: string;
  detail: string;
  comment_id: string | null;
  item_id: string | null;
}
export default function Staff() {
  const [allowed, setAllowed] = useState(false),
    [comments, setComments] = useState<Comment[]>([]),
    [reports, setReports] = useState<Report[]>([]),
    [notice, setNotice] = useState(""),
    [host, setHost] = useState(""),
    [title, setTitle] = useState(""),
    [name, setName] = useState(""),
    [starts, setStarts] = useState(""),
    [ends, setEnds] = useState(""),
    [contentId, setContentId] = useState(""),
    [content, setContent] = useState("");
  const load = useCallback(async () => {
    const { client, user } = await requireUser();
    const { data: role, error } = await client.rpc("staff_role");
    if (error || !role) throw new Error("A moderator account is required.");
    setAllowed(true);
    setHost(user.id);
    const [c, r] = await Promise.all([
      client
        .from("comments")
        .select("id,alias,body,user_id")
        .eq("status", "pending")
        .order("created_at")
        .limit(100),
      client
        .from("reports")
        .select("id,reason,detail,comment_id,item_id")
        .eq("status", "open")
        .order("created_at")
        .limit(100),
    ]);
    if (c.error || r.error) throw new Error("Could not load moderation queue.");
    setComments(c.data ?? []);
    setReports(r.data ?? []);
  }, []);
  async function run(fn: () => Promise<void>) {
    try {
      setNotice("");
      await fn();
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Operation failed.");
    }
  }
  useEffect(() => {
    void Promise.resolve()
      .then(load)
      .catch((e) =>
        setNotice(
          e instanceof Error ? e.message : "Could not load moderation.",
        ),
      );
  }, [load]);
  return (
    <Screen back>
      <Heading>Editorial & moderation</Heading>
      <Notice text={notice} />
      {allowed && (
        <>
          <Body>
            Only approved comments appear to other people. Investigate reports
            promptly and remove abusive content.
          </Body>
          <Subheading>Pending comments</Subheading>
          {comments.map((c) => (
            <Card key={c.id}>
              <Body>
                {c.alias}: {c.body}
              </Body>
              {["approved", "removed"].map((status) => (
                <Button
                  key={status}
                  secondary
                  title={status === "approved" ? "Approve" : "Remove"}
                  onPress={() =>
                    void run(async () => {
                      const { client } = await requireUser();
                      const { error } = await client
                        .from("comments")
                        .update({ status })
                        .eq("id", c.id);
                      if (error) throw error;
                    })
                  }
                />
              ))}
              <Button
                secondary
                title="Suspend author & remove comments"
                onPress={() =>
                  void run(async () => {
                    const { client } = await requireUser();
                    const { error } = await client.rpc("moderate_user", {
                      p_user: c.user_id,
                      p_suspend: true,
                      p_reason: "Moderator review",
                    });
                    if (error) throw error;
                  })
                }
              />
            </Card>
          ))}
          <Subheading>Open reports</Subheading>
          {reports.map((r) => (
            <Card key={r.id}>
              <Body>
                {r.reason}: {r.detail}
              </Body>
              <Body small>
                {r.item_id} · {r.comment_id}
              </Body>
              {r.comment_id && (
                <Button
                  secondary
                  title="Remove reported comment"
                  onPress={() =>
                    void run(async () => {
                      const { client } = await requireUser();
                      const { error } = await client
                        .from("comments")
                        .update({ status: "removed" })
                        .eq("id", r.comment_id);
                      if (error) throw error;
                    })
                  }
                />
              )}
              <Button
                secondary
                title="Mark reviewed"
                onPress={() =>
                  void run(async () => {
                    const { client } = await requireUser();
                    const { error } = await client
                      .from("reports")
                      .update({ status: "reviewed" })
                      .eq("id", r.id);
                    if (error) throw error;
                  })
                }
              />
            </Card>
          ))}
          <Card>
            <Subheading>Schedule a hosted gathering</Subheading>
            <Body small>
              Enter confirmed details only. ISO timestamps must include the UTC
              offset, e.g. 2026-11-12T19:00:00-03:00. The meeting is shown in
              each participant’s time zone.
            </Body>
            <Field label="Title" value={title} onChangeText={setTitle} />
            <Field label="Host name" value={name} onChangeText={setName} />
            <Field
              label="Host account UUID"
              value={host}
              onChangeText={setHost}
            />
            <Field
              label="Starts (ISO with offset)"
              value={starts}
              onChangeText={setStarts}
            />
            <Field
              label="Ends (ISO with offset)"
              value={ends}
              onChangeText={setEnds}
            />
            <Button
              title="Publish confirmed gathering"
              onPress={() =>
                void run(async () => {
                  if (
                    !title.trim() ||
                    !name.trim() ||
                    !/(Z|[+-]\d\d:\d\d)$/.test(starts) ||
                    !/(Z|[+-]\d\d:\d\d)$/.test(ends) ||
                    Date.parse(starts) <= Date.now() ||
                    Date.parse(ends) <= Date.parse(starts)
                  )
                    throw new Error(
                      "Add valid confirmed title, host and future times.",
                    );
                  const { client } = await requireUser();
                  const { error } = await client.from("gatherings").insert({
                    title: { en: title, pt: title, es: title, ru: title },
                    description: {
                      en: "Hosted community conversation",
                      pt: "Conversa comunitária com mediação",
                      es: "Conversación comunitaria moderada",
                      ru: "Встреча сообщества с ведущим",
                    },
                    host_id: host,
                    host_name: name,
                    starts_at: starts,
                    ends_at: ends,
                    status: "published",
                  });
                  if (error) throw error;
                  setTitle("");
                  setNotice("Gathering published.");
                })
              }
            />
          </Card>
          <Card>
            <Subheading>Curated content</Subheading>
            <Field
              label="Existing content ID"
              value={contentId}
              onChangeText={setContentId}
            />
            <Button
              secondary
              title="Load content"
              onPress={() =>
                void run(async () => {
                  const { client } = await requireUser();
                  const { data, error } = await client
                    .from("content_items")
                    .select("data")
                    .eq("id", contentId)
                    .single();
                  if (error) throw error;
                  setContent(JSON.stringify(data.data, null, 2));
                })
              }
            />
            <Field
              label="Localized content JSON"
              multiline
              value={content}
              onChangeText={setContent}
            />
            <Button
              secondary
              title="Save reviewed content"
              onPress={() =>
                void run(async () => {
                  const parsed = JSON.parse(content);
                  if (parsed.id !== contentId || !parsed.title?.en)
                    throw new Error(
                      "Keep the existing ID and localized content.",
                    );
                  const { client } = await requireUser();
                  const { error } = await client
                    .from("content_items")
                    .update({
                      data: parsed,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", contentId);
                  if (error) throw error;
                  setNotice("Content saved.");
                })
              }
            />
            <Button
              secondary
              title="Unpublish content"
              onPress={() =>
                void run(async () => {
                  const { client } = await requireUser();
                  const { error } = await client
                    .from("content_items")
                    .update({ published: false })
                    .eq("id", contentId);
                  if (error) throw error;
                })
              }
            />
          </Card>
        </>
      )}
    </Screen>
  );
}
