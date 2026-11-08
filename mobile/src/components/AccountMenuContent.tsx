import { router, type Href } from "expo-router";
import Disclosure from "./Disclosure";
import { Button, Body } from "./quiet-ui";
import { useInterfaceCopy } from "../lib/use-interface-copy";

export default function AccountMenuContent({ onNavigate }: { onNavigate?: () => void }) {
  const tr = useInterfaceCopy();
  const link = (title: string, route: Href) => (
    <Button key={title} secondary title={tr(title)} onPress={() => {
      onNavigate?.();
      router.push(route);
    }} />
  );
  return <>
    <Disclosure title={tr("Profile")}>
      {link("Edit profile and preferences", "/preferences")}
      {link("Privacy and support", "/privacy")}
      {link("My testimonies", "/testimonies")}
      {link("My calendar", "/my-calendar")}
      {link("Friends", "/profile")}
      {link("Delete data or account", "/profile")}
      {link("Account and settings", "/profile")}
    </Disclosure>
    {link("Church tradition and background", "/practices")}
    {link("My Journal", "/history")}
    {link("Community", "/community")}
    <Disclosure title={tr("Chats")}><Body>{tr("Private chats are not available yet.")}</Body></Disclosure>
    <Disclosure title={tr("Notifications")}>
      {link("My calendar", "/my-calendar")}
      {link("Edit profile and preferences", "/preferences")}
    </Disclosure>
  </>;
}
