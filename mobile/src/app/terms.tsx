import { router } from "expo-router";
import {
  Screen,
  Heading,
  Body,
  Button,
  Card,
  Subheading,
  External,
} from "../components/quiet-ui";
import { useApp } from "../lib/state";
import { label } from "../lib/labels";
import { termsCopy } from "../lib/terms-copy";
import { terms } from "../lib/terms-content";

// The app, agreement popup and public page share the same terms content.

export default function Terms() {
  const { profile } = useApp();
  const language = profile.language;
  return (
    <Screen back>
      <Heading>{(termsCopy[language] ?? termsCopy.en).title}</Heading>
      <Body small>Grace & Gather · 26 November 2026</Body>
      {(terms[language] ?? terms.en).map(([heading, body]) => (
        <Card key={heading}>
          <Subheading>{heading}</Subheading>
          <Body>{body}</Body>
        </Card>
      ))}
      <Button
        secondary
        title={label(language, "privacy")}
        onPress={() => router.push("/privacy")}
      />
      <External
        title="hello@graceandgather.online"
        url="mailto:hello@graceandgather.online"
      />
    </Screen>
  );
}
