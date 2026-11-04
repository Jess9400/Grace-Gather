import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Button,
  Field,
  Notice,
  Busy,
} from "../../components/ui";
import { testimony, Testimony } from "../../lib/discover";
export default function Review() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [items, setItems] = useState<Testimony[]>([]),
    [reasons, setReasons] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const queue = await testimony("queue");
      setItems(id ? [await testimony("read", { id })] : queue);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  async function review(item: Testimony, decision: string) {
    setBusy(true);
    try {
      await testimony(decision === "hide" ? "hide" : "review", {
        id: item.id,
        revision: item.revision,
        decision,
        reason: reasons[item.id] ?? "",
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen back keyboardAware>
      <Heading>Testimony review</Heading>
      <Body small>
        Review the author’s words, privacy, safety and source claims. Approval
        never rewrites their text. Rejection notes are visible only to the
        author and moderators.
      </Body>
      <Notice text={error} />
      {busy && <Busy />}
      {!busy && !error && !items.length && (
        <Body>No testimonies await review.</Body>
      )}
      {items.filter(Boolean).map((item) => (
        <Card key={item.id}>
          <Body small>
            {item.status} · revision {item.revision} ·{" "}
            {item.anonymous ? "Anonymous to readers" : item.display_name}
          </Body>
          <Subheading>{item.title}</Subheading>
          <Body>{item.body}</Body>
          <Body small>{item.tags.join(" · ")}</Body>
          <Field
            label="Private explanation to author"
            multiline
            value={reasons[item.id] ?? ""}
            onChangeText={(text) =>
              setReasons((r) => ({ ...r, [item.id]: text }))
            }
            maxLength={2000}
          />
          {item.status === "pending" && (
            <Button
              title="Approve and publish this version"
              disabled={busy}
              onPress={() => void review(item, "approve")}
            />
          )}
          <Button
            secondary
            title={
              item.status === "published"
                ? "Remove from Discover"
                : "Reject this version"
            }
            disabled={busy || (reasons[item.id]?.trim().length ?? 0) < 5}
            onPress={() =>
              void review(item, item.status === "published" ? "hide" : "reject")
            }
          />
        </Card>
      ))}
    </Screen>
  );
}
