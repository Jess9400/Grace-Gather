import {
  Screen,
  Heading,
  Body,
  Card,
  Subheading,
  External,
} from "../components/quiet-ui";
import { useApp } from "../lib/state";
import { q } from "../lib/quiet-copy";
const organizations = [
  ["Children", "UNICEF", "https://www.unicef.org/take-action"],
  ["Animals", "ASPCA", "https://www.aspca.org/ways-to-give"],
  [
    "Older people",
    "Age International",
    "https://www.ageinternational.org.uk/donation/donate/",
  ],
  [
    "Cancer research",
    "Cancer Research UK",
    "https://www.cancerresearchuk.org/get-involved/donate",
  ],
  [
    "Wildlife",
    "World Wildlife Fund",
    "https://www.worldwildlife.org/support/give/",
  ],
];
export default function Giving() {
  const { profile } = useApp();
  return (
    <Screen back>
      <Heading>{q(profile.language, "giving")}</Heading>
      <Body>
        These are examples, not confirmed partners. Giving happens on each
        organization’s official website. Grace & Gather does not collect
        payments.
      </Body>
      {organizations.map(([category, name, url]) => (
        <Card key={name}>
          <Body small>{category}</Body>
          <Subheading>{name}</Subheading>
          <External title={`Visit ${name}`} url={url} />
        </Card>
      ))}
    </Screen>
  );
}
