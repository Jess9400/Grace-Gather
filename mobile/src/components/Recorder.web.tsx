import { Body } from "./ui";
import { Language } from "../lib/content";
export default function Recorder(_props: {
  language: Language;
  value?: string;
  onChange: (id?: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  return <Body small>Audio recording is available in the iPhone app.</Body>;
}
