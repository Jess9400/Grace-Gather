import { Screen, Heading } from "../components/quiet-ui";
import AccountMenuContent from "../components/AccountMenuContent";
import { useInterfaceCopy } from "../lib/use-interface-copy";
import SafetyFooter from "../components/SafetyFooter";
export default function AccountMenu() {
  const tr = useInterfaceCopy();
  return <Screen back home><Heading>{tr("Your space")}</Heading><AccountMenuContent /><SafetyFooter /></Screen>;
}
