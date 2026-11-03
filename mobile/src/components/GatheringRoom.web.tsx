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
  return <Body>Join this audio gathering in the iPhone app.</Body>;
}
