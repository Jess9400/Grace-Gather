import { Body, External, Heading, Screen } from "../components/quiet-ui";
import { useApp } from "../lib/state";
import { safetyCopy } from "../lib/safety-copy";

export default function Help() {
  const { profile } = useApp();
  const t = safetyCopy(profile.language);
  return <Screen back>
    <Heading>{t.heading}</Heading>
    <Body>{t.intro}</Body>
    <Body small>{t.choose}</Body>
    <External title={t.brazil} url="https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/suicidio-prevencao/suicidio-prevencao" />
    <External title={t.usa} url="https://findahelpline.com/countries/us" />
    <External title={t.other} url="https://findahelpline.com" />
    <Body small>{t.privacy}</Body>
  </Screen>;
}
