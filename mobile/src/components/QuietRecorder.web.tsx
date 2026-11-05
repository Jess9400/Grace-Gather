import { useInterfaceCopy } from "../lib/use-interface-copy";
import { Body } from "./quiet-ui";
import { Language } from "../lib/content";
export default function Recorder(_props: {
  language: Language;
  value?: string;
  onChange: (id?: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const tr = useInterfaceCopy();
  return (
    <Body small>{tr("Audio recording is available in the iPhone app.")}</Body>
  );
}
