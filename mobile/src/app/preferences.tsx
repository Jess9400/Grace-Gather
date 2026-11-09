import { useState } from "react";
import {
  Screen,
  Heading,
  Subheading,
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
  editionsFor,
  normalizeProfile,
  type Language,
  type Profile,
  type Tradition,
} from "../lib/content";
import { label } from "../lib/labels";
import { q } from "../lib/quiet-copy";
import { interfaceCopy } from "../lib/interface-copy";

const TRADITIONS: Tradition[] = ["catholic", "protestant", "orthodox"];
const validEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// Everything chosen during onboarding, shown as it is now. Change any one
// thing and save; nothing walks you through the questions again.
export default function Preferences() {
  const { profile, saveProfile } = useApp();
  const [p, setP] = useState(profile),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const t = (k: string) => copy(p.language, k);
  const tr = (text: string) => interfaceCopy(p.language, text);
  const update = (v: Partial<Profile>) => {
    setSaved(false);
    setError("");
    setP(normalizeProfile({ ...p, ...v }));
  };
  const changed = JSON.stringify(p) !== JSON.stringify(profile);
  const editions = editionsFor(p);

  async function save() {
    if (p.emailConsent && !validEmail(p.email)) {
      setError(t("pEmailConsent"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = {
        ...p,
        name: p.name.trim(),
        city: p.city.trim(),
        email: p.email.trim(),
      };
      await saveProfile(next);
      setP(normalizeProfile(next));
      setSaved(true);
    } catch {
      setError(tr("Could not save. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen back>
      <Heading>{tr("Profile and preferences")}</Heading>

      <Card>
        <Field
          label={t("pName")}
          value={p.name}
          maxLength={60}
          autoComplete="given-name"
          onChangeText={(name) => update({ name })}
        />
      </Card>

      <Card>
        <Subheading>{tr("Your language")}</Subheading>
        <Row>
          {Object.entries(languages).map(([k, v]) => (
            <Chip
              key={k}
              title={v}
              selected={p.language === k}
              onPress={() => update({ language: k as Language })}
            />
          ))}
        </Row>
      </Card>

      <Card>
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
          {tr("This shapes your church and the Bible you read.")}
        </Body>
      </Card>

      <Card>
        <Subheading>{tr("Your Bible")}</Subheading>
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
        {editions.length > 1 && (
          <Row>
            {editions.map((e) => (
              <Chip
                key={e.id}
                title={e.name}
                selected={e.id === p.edition}
                onPress={() => update({ edition: e.id })}
              />
            ))}
          </Row>
        )}
        {editions.length === 1 && <Body small>{editions[0].name}</Body>}
        {!editions.length && <Notice text={t("unavailable")} />}
      </Card>

      <Card>
        <Subheading>{tr("Location")}</Subheading>
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
      </Card>

      <Card>
        <Subheading>{tr("Email reminders")}</Subheading>
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
        <Body small>{label(p.language, "emailNotLive")}</Body>
      </Card>

      <Notice text={error} />
      {saved && !changed && <Notice text={tr("Saved.")} />}
      <Button
        title={tr("Save changes")}
        disabled={busy || !changed}
        onPress={() => void save()}
      />
    </Screen>
  );
}
