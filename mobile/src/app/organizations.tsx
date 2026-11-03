import { router } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  Button,
  External,
} from "../components/ui";
import { useApp } from "../lib/state";
import { copy, localOrganizations } from "../lib/content";
export default function Organizations() {
  const { profile } = useApp(),
    orgs = localOrganizations(profile),
    t = (k: string) => copy(profile.language, k);
  return (
    <Screen back>
      <Heading>{t("pNearYou")}</Heading>
      <Body>
        {[profile.city, profile.region].filter(Boolean).join(" · ") ||
          t("pNoCity")}
      </Body>
      <Button
        secondary
        title={t("pChangeCity")}
        onPress={() => router.push("/onboarding")}
      />
      {!orgs.length && (
        <>
          <Body>{t("pNoOrganizations")}</Body>
          <External title={t("pAtados")} url="https://www.atados.com.br/" />
        </>
      )}
      {orgs.map((o) => (
        <Card key={o.id}>
          <Subheading>{o.name}</Subheading>
          <Body small>{t(o.kind)}</Body>
          <Body>{o.address}</Body>
          {"headquarters" in o && o.headquarters && (
            <Body small>{t("headquarters")}</Body>
          )}
          <Body>{o.phone}</Body>
          <External title={t("contactOrg")} url={o.contact} />
          <External title={t("volunteer")} url={o.volunteer} />
          <External title={t("donate")} url={o.donate} />
        </Card>
      ))}
      <Body small>{t("orgNote")}</Body>
      <Body small>{t("checkedOrganizations")}</Body>
    </Screen>
  );
}
