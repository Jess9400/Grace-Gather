import { Body } from "./ui";
import { Language } from "../lib/content";
import { interfaceCopy } from "../lib/interface-copy";
export default function AudioPlayback({
  language,
}: {
  id: string;
  language: Language;
}) {
  return (
    <Body small>
      {interfaceCopy(language, "Open this recording in the iPhone app.")}
    </Body>
  );
}
