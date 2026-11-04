import { ScrollView } from "react-native";
import { testimonyCopy } from "../../lib/testimony-copy";
import { backend } from "../../lib/backend";
import { useEffect, useState, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Button,
  Field,
  Notice,
  Chip,
  Subheading,
} from "../../components/ui";
import { testimony, Testimony } from "../../lib/discover";
import { useApp } from "../../lib/state";
export default function EditTestimony() {
  const { id } = useLocalSearchParams<{ id?: string }>(),
    { profile } = useApp(),
    t = (k: string) => testimonyCopy(profile.language, k);
  const [draft, setDraft] = useState<Testimony>(),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [name, setName] = useState(profile.name),
    [tags, setTags] = useState(""),
    [anonymous, setAnonymous] = useState(false),
    [preview, setPreview] = useState(false),
    [agree, setAgree] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    void backend?.auth.getSession().then((x) => setSignedIn(!!x.data.session));
    const s = backend?.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session),
    );
    return () => s?.data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (id)
      void testimony("read", { id })
        .then((d: Testimony) => {
          setDraft(d);
          setTitle(d.title);
          setBody(d.body);
          setName(d.display_name);
          setTags(d.tags.join(", "));
          setAnonymous(d.anonymous);
        })
        .catch((e) => setError(e.message));
  }, [id]);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const valid =
    title.trim().length >= 3 &&
    body.trim().length >= 20 &&
    (anonymous || name.trim().length > 0) &&
    tags.split(",").filter((x) => x.trim()).length <= 5;
  async function save(publish: boolean) {
    setBusy(true);
    setError("");
    try {
      const d = await testimony(publish ? "publish" : "draft", {
        id: draft?.id,
        title,
        body,
        displayName: anonymous ? name || "Anonymous member" : name,
        anonymous,
        tags: tags
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        language: draft?.language ?? profile.language,
        revision: draft?.revision,
        previewed: preview && agree,
        audience: "discover_public",
      });
      setDraft(d);
      if (publish) setDone(true);
      else setError(t("draftSaved"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <Screen back>
        <Heading>{t("sent")}</Heading>
        <Body>{t("sentNote")}</Body>
        <Button
          title={t("mine")}
          onPress={() => router.replace("/testimonies")}
        />
      </Screen>
    );
  return (
    <Screen back keyboardAware scrollRef={scroll}>
      <Heading>{t(preview ? "preview" : draft ? "edit" : "share")}</Heading>
      <Notice text={error} />
      {!signedIn && (
        <Button
          secondary
          title={t("account")}
          onPress={() => router.push("/account")}
        />
      )}
      {preview ? (
        <>
          <Card>
            <Body small>
              {t("label")} · {anonymous ? t("anonymousName") : name}
            </Body>
            <Subheading>{title}</Subheading>
            <Body>{body}</Body>
            {!!tags && <Body small>{tags}</Body>}
          </Card>
          <Body>{t("audience")}</Body>
          <Body small>{t("reviewNotice")}</Body>
          <Chip
            title={t("agree")}
            selected={agree}
            onPress={() => setAgree(!agree)}
          />
          <Button
            title={t("publish")}
            disabled={!agree || busy}
            onPress={() => void save(true)}
          />
          <Button
            secondary
            title={t("keepEditing")}
            disabled={busy}
            onPress={() => {
              setPreview(false);
              setAgree(false);
            }}
          />
        </>
      ) : (
        <>
          <Body small>{t("intro")}</Body>
          {draft?.status === "published" && (
            <Body small>{t("editNotice")}</Body>
          )}
          <Field
            label={t("title")}
            value={title}
            onChangeText={setTitle}
            maxLength={160}
          />
          <Field
            label={t("body")}
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={20000}
            style={{ minHeight: 250, textAlignVertical: "top" }}
          />
          <Field
            label={t("topics")}
            value={tags}
            onChangeText={setTags}
            maxLength={200}
          />
          <Chip
            title={t("anonymous")}
            selected={anonymous}
            onPress={() => setAnonymous(!anonymous)}
          />
          {!anonymous && (
            <Field
              label={t("name")}
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
          )}
          <Body small>{t("privacy")}</Body>
          <Button
            title={t("previewButton")}
            disabled={!valid || busy}
            onPress={() => {
              setError("");
              setPreview(true);
              requestAnimationFrame(() => scroll.current?.scrollTo({y:0,animated:false}));
            }}
          />
          <Button
            secondary
            title={t("draftButton")}
            disabled={!valid || busy}
            onPress={() => void save(false)}
          />
        </>
      )}
    </Screen>
  );
}
