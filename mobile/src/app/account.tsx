import { Screen, Heading } from "../components/quiet-ui";
import AccountMenuContent from "../components/AccountMenuContent";
import { useInterfaceCopy } from "../lib/use-interface-copy";
export default function AccountMenu() {
  const tr = useInterfaceCopy();
  return <Screen back><Heading>{tr("Your space")}</Heading><AccountMenuContent /></Screen>;
}
