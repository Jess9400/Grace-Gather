import { Body } from "./ui";
import { Language } from "../lib/content";
export default function AudioPlayback(_props: {
  id: string;
  language: Language;
}) {
  return <Body small>Open this recording in the iPhone app.</Body>;
}
