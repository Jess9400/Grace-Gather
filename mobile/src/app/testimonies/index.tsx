import { useApp } from "../../lib/state";
import { testimonyCopy } from "../../lib/testimony-copy";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Button,
  Notice,
  Busy,
} from "../../components/community-ui";
import { testimony, Testimony } from "../../lib/discover";
export default function MyTestimonies() {
  const { profile } = useApp(),
    t = (k: string) => testimonyCopy(profile.language, k);
  const [items, setItems] = useState<Testimony[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [removing, setRemoving] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await testimony("mine"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return (
    <Screen back>
      <Heading>{t("mine")}</Heading>
      <Button
        title={t("share")}
        onPress={() => router.push("/testimonies/edit")}
      />
      <Notice text={error} />
      {!!error && (
        <Button
          secondary
          title={t("account")}
          onPress={() => router.push("/account")}
        />
      )}
      {loading && <Busy />}
      {!loading && !error && !items.length && <Body>{t("empty")}</Body>}
      {items.map((item) => (
        <Card key={item.id}>
          <Body small>{t(item.status)}</Body>
          <Subheading>{item.title}</Subheading>
          {item.status === "rejected" && (
            <Body>
              {t("note")}: {item.rejection_reason}
            </Body>
          )}
          <Button
            secondary
            title={t("editButton")}
            onPress={() =>
              router.push({
                pathname: "/testimonies/edit",
                params: { id: item.id },
              })
            }
          />
          {item.status === "published" && (
            <Button
              secondary
              title={t("view")}
              onPress={() =>
                router.push({
                  pathname: "/story/[id]",
                  params: { id: "testimony-" + item.id },
                })
              }
            />
          )}
          {removing === item.id ? (
            <>
              <Body>{t("deleteConfirm")}</Body>
              <Button
                title={t("deleteButton")}
                onPress={() =>
                  void testimony("delete", { id: item.id })
                    .then(load)
                    .catch((e) => setError(e.message))
                }
              />
              <Button
                secondary
                title={t("keep")}
                onPress={() => setRemoving("")}
              />
            </>
          ) : (
            <Button
              secondary
              title={t("delete")}
              onPress={() => setRemoving(item.id)}
            />
          )}
        </Card>
      ))}
    </Screen>
  );
}
