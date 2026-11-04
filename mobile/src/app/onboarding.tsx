import { useState } from "react";
import { router } from "expo-router";
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
} from "../components/quiet-ui";
import { useApp } from "../lib/state";
import {
  copy,
  languages,
  Language,
  Tradition,
  editionsFor,
  normalizeProfile,
} from "../lib/content";
import { label } from "../lib/labels";
import { persistent } from "../lib/storage";
import { q } from "../lib/quiet-copy";
import { TRADITION_QUESTION_VERSION } from "../lib/onboarding";
const headings = [
  "pWelcome",
  "pYourName",
  "pIntent",
  "pFaith",
  "pLocation",
  "pNotifications",
  "pReady",
];
export default function ProfileSetup() {
  const { profile, saveProfile } = useApp();
  const [p, setP] = useState(profile),
    [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const t = (k: string) => copy(p.language, k);
  const update = (v: Partial<typeof p>) =>
    setP(normalizeProfile({ ...p, ...v }));
  async function finish() {
    if (p.emailConsent && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
      setStep(5); setError(t("pEmailConsent")); return;
    }
    setBusy(true);
    setError("");
    try {
      await saveProfile({ ...p, email: p.email.trim(), onboarded: true,
        faithChoice: p.faithChoice ?? "unspecified",
        traditionQuestionVersion: TRADITION_QUESTION_VERSION });
      router.replace("/(tabs)");
    } catch { setError(t("pSaveError")); }
    finally { setBusy(false); }
  }
  async function next() {
    setError("");
    if (
      step === 5 &&
      p.emailConsent &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)
    ) {
      setError(t("pEmailConsent"));
      return;
    }
    if (step < 6) {
      setStep(step + 1);
      return;
    }
    await finish();
  }

  return (
    <Screen>
      <Body small>
        {t("pStep")} {step + 1} / 7
      </Body>
      <Heading>{t(headings[step])}</Heading>
      {step === 0 && (
        <>
          <Body>{t("pWelcomeSub")}</Body>
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
          <Card tint>
            <Body>{label(p.language, persistent ? "device" : "webDemo")}</Body>
          </Card>
        </>
      )}
      {step === 1 && (
        <>
          <Body>{t("pNameSub")}</Body>
          <Field
            label={t("pName")}
            value={p.name}
            maxLength={60}
            onChangeText={(name) => update({ name })}
          />
        </>
      )}
      {step === 2 && (
        <>
          <Body>{t("pIntentSub")}</Body>
          {["faith", "calm", "connection", "kindness"].map((x) => (
            <Chip
              key={x}
              title={t("p" + x[0].toUpperCase() + x.slice(1) + "Goal")}
              selected={p.intent === x}
              onPress={() => update({ intent: x })}
            />
          ))}
        </>
      )}
      {step === 3 && (
        <>
          <Body>{t("pFaithSub")}</Body>
          <Row>
            {["protestant", "catholic", "orthodox"].map((x) => (
              <Chip
                key={x}
                title={t(x)}
                selected={p.faithChoice === x}
                onPress={() =>
                  update({
                    tradition: x as Tradition,
                    faithChoice: x as Tradition,
                  })
                }
              />
            ))}
          </Row>
          <Row>
            <Chip title={q(p.language, "exploring")} selected={p.faithChoice === "exploring"}
              onPress={() => update({ faithChoice: "exploring" })} />
            <Chip title={q(p.language, "skip")} selected={p.faithChoice === "unspecified"}
              onPress={() => update({ faithChoice: "unspecified" })} />
          </Row>
          <Body small>{t("scriptureLanguage")}</Body>
          <Row>
            {Object.entries(languages).map(([k, v]) => (
              <Chip
                key={k}
                title={v}
                selected={p.scriptureLanguage === k}
                onPress={() => update({ scriptureLanguage: k as Language })}
              />
            ))}
          </Row>
          {editionsFor(p).map((e) => (
            <Chip
              key={e.id}
              title={e.name}
              selected={e.id === p.edition}
              onPress={() => update({ edition: e.id })}
            />
          ))}
          {!editionsFor(p).length && <Notice text={t("unavailable")} />}
          <Body small>{t("editionHelp")}</Body>
        </>
      )}
      {step === 4 && (
        <>
          <Body>{t("pLocationSub")}</Body>
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
          <Body small>{t("pBrazilNote")}</Body>
        </>
      )}
      {step === 5 && (
        <>
          <Body>{t("pNotificationsSub")}</Body>
          <Field
            label={t("pEmail")}
            keyboardType="email-address"
            autoCapitalize="none"
            value={p.email}
            maxLength={254}
            onChangeText={(email) => update({ email })}
          />
          <Chip
            title={(p.emailConsent ? "✓ " : "") + t("pConsent")}
            selected={p.emailConsent}
            onPress={() => update({ emailConsent: !p.emailConsent })}
          />
          <Notice text={label(p.language, "emailNotLive")} />
        </>
      )}
      {step === 6 && (
        <>
          <Body>{t("pReadySub")}</Body>
          <Card tint>
            <Body>
              {t("pDaily")} → {t("journal")} → {t("stepVerse")} →{" "}
              {t("stepAction")}
            </Body>
          </Card>
        </>
      )}
      <Notice text={error} />
      <Button
        title={t(step === 6 ? "pStartJournal" : "pContinue")}
        onPress={() => void next()}
        disabled={busy}
      />
      {step > 0 && (
        <Button
          secondary
          title={t("pBack")}
          onPress={() => setStep(step - 1)}
        />
      )}
      <Button
        secondary
        title={profile.onboarded ? q(p.language, "savePreferences") : t("pLater")}
        disabled={busy}
        onPress={() => void finish()}
      />
    </Screen>
  );
}
