import { useState } from "react";
import { router } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Button,
  Field,
  Notice,
} from "../components/ui";
import { useApp } from "../lib/state";
import { copy } from "../lib/content";
export default function History() {
  const { entries, profile, deleteEntry } = useApp();
  const [query, setQuery] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState("");
  const t = (k: string) => copy(profile.language, k);
  return (
    <Screen back>
      <Heading>{t("history")}</Heading>
      <Field label={t("search")} value={query} onChangeText={setQuery} />
      <Notice text={error} />
      {!entries.length && <Body>{t("emptySub")}</Body>}
      {entries
        .filter((e) =>
          (
            e.text +
            " " +
            e.reflection +
            " " +
            t(e.guidance === "general" ? "generalContext" : e.mood)
          )
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map((e) => (
          <Card key={e.id}>
            <Body small>
              {new Date(e.createdAt).toLocaleString(profile.language)} ·{" "}
              {t(e.guidance === "general" ? "generalContext" : e.mood)}
            </Body>
            <Body>{e.text.slice(0, 180) || t("audioEntry")}</Body>
            <Button
              secondary
              title={t("savedPath")}
              onPress={() =>
                router.push({ pathname: "/entry/[id]", params: { id: e.id } })
              }
            />
            {confirm === e.id ? (
              <>
                <Body>{t("deleteTitle")}</Body>
                <Button
                  title={t("delete")}
                  onPress={() => {
                    void deleteEntry(e.id)
                      .then(() => setConfirm(""))
                      .catch(() => setError(t("storageError")));
                  }}
                />
                <Button
                  secondary
                  title={t("cancel")}
                  onPress={() => setConfirm("")}
                />
              </>
            ) : (
              <Button
                secondary
                title={t("delete")}
                onPress={() => setConfirm(e.id)}
              />
            )}
          </Card>
        ))}
    </Screen>
  );
}
