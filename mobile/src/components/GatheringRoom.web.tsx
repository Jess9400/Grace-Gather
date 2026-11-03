import { useApp } from "../lib/state";
import { label } from "../lib/labels";
import { Body } from "./ui";
export interface RoomAccess {
  token: string;
  url: string;
  endsAt: string;
  host: boolean;
  canSpeak: boolean;
}
export default function GatheringRoom(_props: {
  id: string;
  access: RoomAccess;
}) {
  const { profile } = useApp();
  return <Body>{label(profile.language, "gatheringNative")}</Body>;
}
