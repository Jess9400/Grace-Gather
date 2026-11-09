import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Screen,
  Heading,
  Body,
  Button,
  Chip,
  Row,
  Field,
  Notice,
  Card,
  Subheading,
  colors,
} from "../components/quiet-ui";
import { useApp } from "../lib/state";
import {
  copy,
  languages,
  type Language,
  type Profile,
  type Tradition,
  normalizeProfile,
  editionsFor,
} from "../lib/content";
import { label } from "../lib/labels";
import { persistent } from "../lib/storage";
import { q } from "../lib/quiet-copy";
import { interfaceCopy } from "../lib/interface-copy";
import { TRADITION_QUESTION_VERSION } from "../lib/onboarding";

const TRADITIONS: Tradition[] = ["catholic", "protestant", "orthodox"];
const chosen = (p: Profile) =>
  !!p.faithChoice && p.faithChoice !== "unspecified";

// Two short steps: language and tradition (required, they shape the church
// and the Bible), then an optional name and city. Everything else, including
// the Bible edition, starts from sensible defaults and lives in Preferences.
export default function Onboarding() {
  const { profile, saveProfile } = useApp();
  const [p, setP] = useState(profile),
    [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const t = (k: string) => copy(p.language, k);
  const tr = (text: string) => interfaceCopy(p.language, text);
  const update = (v: Partial<Profile>) =>
    setP(normalizeProfile({ ...p, ...v }));
  // The Bible that the chosen language and tradition will give them.
  const bible = editionsFor(p).find((e) => e.id === p.edition);

  async function finish() {
    setBusy(true);
    setError("");
    try {
      await saveProfile({
        ...p,
        name: p.name.trim(),
        city: p.city.trim(),
        onboarded: true,
        traditionQuestionVersion: TRADITION_QUESTION_VERSION,
      });
      router.replace("/(tabs)");
    } catch {
      setError(t("pSaveError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Body small>
        {t("pStep")} {step + 1} / 2
      </Body>
      {step === 0 ? (
        <>
          <Heading>{t("pWelcome")}</Heading>
          <Body>{t("pWelcomeSub")}</Body>

          <Subheading>{tr("Your language")}</Subheading>
          <Row>
            {Object.entries(languages).map(([k, v]) => (
              <Chip
                key={k}
                title={v}
                selected={p.language === k}
                onPress={() =>
                  update({
                    language: k as Language,
                    scriptureLanguage: k as Language,
                  })
                }
              />
            ))}
          </Row>

          <Subheading>{tr("Your tradition")}</Subheading>
          <Row>
            {TRADITIONS.map((x) => (
              <Chip
                key={x}
                title={t(x)}
                selected={p.faithChoice === x}
                onPress={() => update({ tradition: x, faithChoice: x })}
              />
            ))}
            <Chip
              title={q(p.language, "exploring")}
              selected={p.faithChoice === "exploring"}
              onPress={() => update({ faithChoice: "exploring" })}
            />
          </Row>
          <Body small>
            {tr(
              "This shapes your church and the Bible you read. You can change it anytime in your profile.",
            )}
          </Body>
          {chosen(p) && (
            <View
              accessibilityLiveRegion="polite"
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Ionicons name="book-outline" size={18} color={colors.goldInk} />
              <View style={{ flex: 1 }}>
                <Body small>
                  {bible
                    ? `${tr("Your Bible")}: ${bible.name}`
                    : tr(
                        "No verified Bible for this tradition in this language yet. You can choose another Bible language later in your profile.",
                      )}
                </Body>
              </View>
            </View>
          )}
          <Card tint>
            <Body small>
              {label(p.language, persistent ? "device" : "webDemo")}
            </Body>
          </Card>
          <Button
            title={t("pContinue")}
            disabled={!chosen(p)}
            onPress={() => setStep(1)}
          />
        </>
      ) : (
        <>
          <Heading>{tr("A little about you")}</Heading>
          <Body>
            {tr(
              "Both are optional. Your city helps us suggest local ways to help; no precise location is needed.",
            )}
          </Body>
          <Field
            label={t("pName")}
            value={p.name}
            maxLength={60}
            autoComplete="given-name"
            onChangeText={(name) => update({ name })}
          />
          <Row>
            <Chip
              title={t("pBrazil")}
              selected={p.country === "BR"}
              onPress={() => update({ country: "BR" })}
            />
            <Chip
              title={t("pOther")}
              selected={p.country !== "BR"}
              onPress={() => update({ country: "OTHER" })}
            />
          </Row>
          <Field
            label={t("pCity")}
            value={p.city}
            maxLength={80}
            onChangeText={(city) => update({ city })}
          />
          <Field
            label={t("pRegion") + (p.country === "BR" ? " (SP, RJ…)" : "")}
            autoCapitalize="characters"
            value={p.region}
            maxLength={80}
            onChangeText={(region) => update({ region: region.toUpperCase() })}
          />
          <Notice text={error} />
          <Button
            title={tr("Enter the church")}
            disabled={busy}
            onPress={() => void finish()}
          />
          <Button
            secondary
            title={t("pBack")}
            disabled={busy}
            onPress={() => setStep(0)}
          />
        </>
      )}
    </Screen>
  );
}
