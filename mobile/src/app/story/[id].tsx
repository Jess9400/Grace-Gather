import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Share } from "react-native";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Row,
  Button,
  Field,
  Notice,
  External,
  Chip,
  Busy,
} from "../../components/ui";
import { useApp } from "../../lib/state";
import { copy, localized, data } from "../../lib/content";
import { label } from "../../lib/labels";
import { useCatalog } from "../../lib/community";
import { backend, requireUser } from "../../lib/backend";
interface Comment {
  id: string;
  user_id: string;
  alias: string;
  body: string;
  status: string;
}
export default function Story() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useApp();
  const { items, loading } = useCatalog("feed");
  const item = items.find((x) => x.id === id);
  const [comments, setComments] = useState<Comment[]>([]),
    [uid, setUid] = useState(""),
    [liked, setLiked] = useState(false),
    [count, setCount] = useState(0),
    [body, setBody] = useState(""),
    [alias, setAlias] = useState(profile.name),
    [agree, setAgree] = useState(false),
    [notice, setNotice] = useState(""),
    [report, setReport] = useState<{ comment: string | null } | null>(null),
    [busy, setBusy] = useState(false);
  const t = (k: string) => copy(profile.language, k),
    l = (k: string) => label(profile.language, k);
  const reload = useCallback(async () => {
    if (!backend) return;
    const {
      data: { user },
    } = await backend.auth.getUser();
    setUid(user?.id ?? "");
    if (!user) return;
    const [c, like, stats] = await Promise.all([
      backend
        .from("comments")
        .select("id,user_id,alias,body,status")
        .eq("item_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      backend
        .from("likes")
        .select("item_id")
        .eq("item_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      backend.rpc("feed_stats"),
    ]);
    if (c.error || like.error || stats.error) throw new Error("community");
    setComments(c.data ?? []);
    setLiked(!!like.data);
    setCount(
      Number(
        stats.data?.find((s: { item_id: string }) => s.item_id === id)?.likes ??
          0,
      ),
    );
  }, [id]);
  useEffect(() => {
    void Promise.resolve()
      .then(reload)
      .catch(() => setNotice(copy(profile.language, "socialError")));
    const sub = backend?.auth.onAuthStateChange(() => {
      void reload().catch(() => {});
    });
    return () => sub?.data.subscription.unsubscribe();
  }, [reload, profile.language]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
      await reload();
    } catch {
      setNotice(t("socialError"));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <Screen back>
        <Busy />
      </Screen>
    );
  if (!item || (item.tradition && item.tradition !== profile.tradition))
    return (
      <Screen back>
        <Body>{l("notFound")}</Body>
      </Screen>
    );
  const psalm =
    id === "psalm-23"
      ? data.PSALM23[profile.edition as keyof typeof data.PSALM23]
      : null;
  return (
    <Screen back>
      <Body small>
        {item.source} · {item.tags?.map(t).join(" · ")}
      </Body>
      <Heading>{localized(item.title, profile.language)}</Heading>
      <Body>{localized(item.summary, profile.language)}</Body>
      <Card tint>
        <Subheading>{t("contextTitle")}</Subheading>
        <Body>{localized(item.body, profile.language)}</Body>
      </Card>
      {psalm && (
        <Card>
          <Subheading>{psalm.reference}</Subheading>
          {psalm.verses.map((v, i) => (
            <Body key={i}>
              {i + 1}. {v}
            </Body>
          ))}
          <External title={t("source")} url={psalm.source} />
        </Card>
      )}
      {item.resources?.map(([type, title, url]) => (
        <External key={url} title={t(type) + " · " + title} url={url} />
      ))}
      <Body small>{t("externalContent")}</Body>
      <Row>
        <Button
          secondary
          disabled={busy}
          title={`${t(liked ? "liked" : "like")} ${count || ""}`}
          onPress={() => {
            if (!uid) {
              router.push("/account");
              return;
            }
            void action(async () => {
              const { client, user } = await requireUser();
              const result = liked
                ? await client
                    .from("likes")
                    .delete()
                    .eq("item_id", id)
                    .eq("user_id", user.id)
                : await client
                    .from("likes")
                    .insert({ item_id: id, user_id: user.id });
              if (result.error) throw result.error;
            });
          }}
        />
        <Button
          secondary
          title={t("share")}
          onPress={() => {
            void Share.share({
              message:
                localized(item.title, profile.language) +
                " " +
                (item.resources?.[0]?.[2] ?? ""),
            });
          }}
        />
        <Button
          secondary
          title={l("report")}
          onPress={() =>
            uid ? setReport({ comment: null }) : router.push("/account")
          }
        />
      </Row>
      <Notice text={notice} />
      {report && (
        <Card>
          <Subheading>{l("report")}</Subheading>
          {["abuse", "harm", "spam", "rights", "other"].map((reason) => (
            <Button
              key={reason}
              secondary
              disabled={busy}
              title={reason}
              onPress={() =>
                void action(async () => {
                  const { client } = await requireUser();
                  const { error } = await client.rpc("report_content", {
                    p_item: id,
                    p_comment: report.comment,
                    p_reason: reason,
                    p_detail: "",
                  });
                  if (error) throw error;
                  setReport(null);
                  setNotice(l("reported"));
                })
              }
            />
          ))}
          <Button
            secondary
            title={t("cancel")}
            onPress={() => setReport(null)}
          />
        </Card>
      )}
      <Subheading>{t("commentsTitle")}</Subheading>
      <Body small>{l("communityRules")}</Body>
      {!uid ? (
        <Button
          title={l("signInCommunity")}
          onPress={() => router.push("/account")}
        />
      ) : (
        <>
          <Field
            label={t("displayName")}
            value={alias}
            maxLength={40}
            onChangeText={setAlias}
          />
          <Field
            label={t("commentPlaceholder")}
            value={body}
            maxLength={600}
            onChangeText={setBody}
            multiline
          />
          <Chip
            title={l("agree")}
            selected={agree}
            onPress={() => setAgree(!agree)}
          />
          <Button
            disabled={!agree || !body.trim() || !alias.trim() || busy}
            title={t("postComment")}
            onPress={() =>
              void action(async () => {
                const { client } = await requireUser();
                const { error } = await client.rpc("post_comment", {
                  p_item: id,
                  p_alias: alias,
                  p_body: body,
                });
                if (error) throw error;
                setBody("");
                setNotice(l("pending"));
              })
            }
          />
        </>
      )}
      {comments.map((c) => (
        <Card key={c.id}>
          <Subheading>{c.alias}</Subheading>
          <Body>{c.body}</Body>
          {c.status === "pending" && <Body small>{l("pending")}</Body>}
          <Row>
            {c.user_id === uid ? (
              <Button
                secondary
                title={t("removeComment")}
                onPress={() =>
                  void action(async () => {
                    const { client } = await requireUser();
                    const { error } = await client
                      .from("comments")
                      .delete()
                      .eq("id", c.id);
                    if (error) throw error;
                  })
                }
              />
            ) : (
              <>
                <Button
                  secondary
                  title={l("report")}
                  onPress={() => setReport({ comment: c.id })}
                />
                <Button
                  secondary
                  title={l("block")}
                  onPress={() =>
                    void action(async () => {
                      const { client, user } = await requireUser();
                      const { error } = await client.from("blocks").upsert(
                        { user_id: user.id, blocked_user_id: c.user_id },
                        {
                          onConflict: "user_id,blocked_user_id",
                          ignoreDuplicates: true,
                        },
                      );
                      if (error) throw error;
                    })
                  }
                />
              </>
            )}
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
