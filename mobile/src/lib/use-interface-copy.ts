import { useApp } from "./state";
import { interfaceCopy } from "./interface-copy";
export function useInterfaceCopy() {
  const { profile } = useApp();
  return (text: string) => interfaceCopy(profile.language, text);
}
