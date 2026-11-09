import { useEffect, useState } from "react";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  External,
  Field,
  Button,
  Notice,
} from "../components/quiet-ui";
import { TextAction } from "../components/CommunityControls";
import { requireUser } from "../lib/backend";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import { useApp } from "../lib/state";
import { jc } from "../lib/journal-copy";
type Item = {
  id: string;
  title: string;
  body: string;
  location: string;
  website: string;
  status?: string;
  reason?: string;
};
const organizations = [
  ["UNICEF", "https://www.unicef.org/take-action"],
  [
    "Red Cross and Red Crescent",
    "https://www.ifrc.org/national-societies-directory",
  ],
  ["UN Volunteers", "https://www.unv.org/become-volunteer"],
];
export default function Giving({ review = false }: { review?: boolean }) {
  const tr = useInterfaceCopy();
  const { profile } = useApp();
  const [items, setItems] = useState<Item[]>([]),
    [mine, setMine] = useState<Item[]>([]),
    [notice, setNotice] = useState("");
  const [compose, setCompose] = useState(false),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [location, setLocation] = useState(""),
    [website, setWebsite] = useState(""),
    [reason, setReason] = useState("");
  const [page, setPage] = useState(0);
  async function load() {
    try {
      const { client, user } = await requireUser();
      if (review) {
        const { data, error } = await client
          .from("pay_forward_submissions")
          .select("*")
          .eq("status", "pending")
          .order("created_at")
          .range(page * 20, page * 20 + 19);
        if (error) throw error;
        setItems(data ?? []);
      } else {
        const [pub, own] = await Promise.all([
          client.rpc("pay_forward_list", { p_offset: page * 20 }),
          client
            .from("pay_forward_submissions")
            .select("*")
            .eq("owner_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);
        if (pub.error || own.error) throw pub.error || own.error;
        setItems(pub.data ?? []);
        setMine(own.data ?? []);
      }
      setNotice("");
    } catch {
      setNotice(
        tr(
          "Sign in to view and submit community recommendations. If you are signed in, please try again.",
        ),
      );
    }
  }
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [page, review]); // eslint-disable-line react-hooks/exhaustive-deps
  async function submit() {
    setBusy(true);
    try {
      const { client } = await requireUser();
      const { error } = await client.rpc("pay_forward_submit", {
        p_title: title,
        p_body: body,
        p_location: location,
        p_website: website,
      });
      if (error) throw error;
      setCompose(false);
      setPreview(false);
      setTitle("");
      setBody("");
      setLocation("");
      setWebsite("");
      await load();
    } catch {
      setNotice(
        tr(
          "Could not submit. Your writing is still here. Please sign in and try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function moderate(id: string, approve: boolean) {
    setBusy(true);
    try {
      const { client } = await requireUser();
      const { error } = await client.rpc("pay_forward_review", {
        p_id: id,
        p_approve: approve,
        p_reason: reason,
      });
      if (error) throw error;
      setReason("");
      await load();
    } catch {
      setNotice(
        tr(
          "Could not review this submission. A moderator account and a reason for rejection are required.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function withdraw(id: string) {
    setBusy(true);
    try {
      const { client } = await requireUser();
      const { error } = await client
        .from("pay_forward_submissions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch {
      setNotice(tr("Could not remove this submission. Please try again."));
    } finally {
      setBusy(false);
    }
  }
  function content(item: Item) {
    return (
      <>
        <Subheading>{item.title}</Subheading>
        {!!item.location && <Body small>{item.location}</Body>}
        <Body>{item.body}</Body>
        {!!item.website && (
          <External title={tr("Visit website")} url={item.website} />
        )}
      </>
    );
  }
  return (
    <Screen back>
      <Heading>{jc(profile.language, "pay")}</Heading>
      <Notice text={notice} />
      {!review && (
        <>
          <Body>
            {tr("Find a small way to help. Giving money is never required.")}
          </Body>
          {organizations.map(([name, url]) => (
            <Card key={name}>
              <Body small>{tr("Official resource")}</Body>
              <Subheading>{name}</Subheading>
              <External title={tr("Explore ways to help")} url={url} />
            </Card>
          ))}
          <TextAction
            title={tr("Share charity work or an organization")}
            icon="add"
            onPress={() => {
              setCompose(true);
              setPreview(false);
            }}
          />
          {compose && (
            <Card>
              {preview ? (
                <>
                  <Subheading>{tr("Preview")}</Subheading>
                  {content({ id: "preview", title, body, location, website })}
                  <Body small>
                    {tr(
                      "After review, this recommendation will be visible to signed-in members and may be shared. It stays linked to your account for moderation. Do not include private contact details.",
                    )}
                  </Body>
                  <Button
                    title={tr("Submit for review")}
                    disabled={busy}
                    onPress={() => void submit()}
                  />
                  <TextAction
                    title={tr("Edit")}
                    onPress={() => setPreview(false)}
                  />
                </>
              ) : (
                <>
                  <Field
                    label={tr("Title")}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={120}
                  />
                  <Field
                    label={tr("Your charity work or organization")}
                    value={body}
                    onChangeText={setBody}
                    multiline
                    maxLength={4000}
                  />
                  <Field
                    label={tr("Country and city (optional)")}
                    value={location}
                    onChangeText={setLocation}
                    maxLength={160}
                  />
                  <Field
                    label={tr("Official website (optional, https://)")}
                    value={website}
                    onChangeText={setWebsite}
                    maxLength={500}
                  />
                  <Button
                    title={tr("Preview")}
                    disabled={
                      title.trim().length < 3 ||
                      body.trim().length < 20 ||
                      (!!website && !/^https:\/\/[^\s]+$/.test(website))
                    }
                    onPress={() => setPreview(true)}
                  />
                </>
              )}
              <TextAction
                title={tr("Cancel")}
                onPress={() => setCompose(false)}
              />
            </Card>
          )}
          {!!mine.length && <Subheading>{tr("My submissions")}</Subheading>}
          {mine.map((item) => (
            <Card key={item.id}>
              {content(item)}
              <Body small>{tr(item.status ?? "pending")}</Body>
              {!!item.reason && <Body>{item.reason}</Body>}
              <TextAction
                title={tr("Remove submission")}
                disabled={busy}
                onPress={() => void withdraw(item.id)}
              />
            </Card>
          ))}
        </>
      )}
      <Subheading>
        {tr(review ? "Pending review" : "Community recommendations")}
      </Subheading>
      <Body small>
        {tr(
          "Member recommendations are not verified partnerships. Check each organization before giving.",
        )}
      </Body>
      {!items.length && (
        <Body>
          {tr(
            review
              ? "No submissions waiting for review."
              : "No community recommendations yet.",
          )}
        </Body>
      )}
      {review && (
        <Field
          label={tr("Private rejection reason")}
          value={reason}
          onChangeText={setReason}
          maxLength={1000}
        />
      )}
      {items.map((item) => (
        <Card key={item.id}>
          {content(item)}
          {review && (
            <>
              <Button
                title={tr("Approve")}
                disabled={busy}
                onPress={() => void moderate(item.id, true)}
              />
              <Button
                secondary
                title={tr("Reject")}
                disabled={busy || !reason.trim()}
                onPress={() => void moderate(item.id, false)}
              />
            </>
          )}
        </Card>
      ))}
      {page > 0 && (
        <TextAction title={tr("Previous")} onPress={() => setPage(page - 1)} />
      )}
      {items.length === 20 && (
        <TextAction title={tr("Next")} onPress={() => setPage(page + 1)} />
      )}
      <TextAction title={tr("Refresh")} onPress={() => void load()} />
    </Screen>
  );
}
