import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  AudioSession,
  registerGlobals,
  useLocalParticipant,
  useLocalParticipantPermissions,
  useParticipants,
  useRoomContext,
} from "@livekit/react-native";
import { AudioModule } from "expo-audio";
import { router } from "expo-router";
import { Button, Body, Card, Notice } from "./ui";
import { useApp } from "../lib/state";
import { label } from "../lib/labels";
import { requireUser } from "../lib/backend";
registerGlobals();
export interface RoomAccess {
  token: string;
  url: string;
  endsAt: string;
  host: boolean;
  canSpeak: boolean;
}
function Controls({ id, access }: { id: string; access: RoomAccess }) {
  const { profile } = useApp();
  const l = (key: string) => label(profile.language, key);
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant(),
    permissions = useLocalParticipantPermissions(),
    participants = useParticipants(),
    room = useRoomContext();
  const [notice, setNotice] = useState(""),
    [raised, setRaised] = useState(false);
  async function command(
    action: string,
    participant?: string,
    enabled?: boolean,
  ) {
    try {
      const { client } = await requireUser();
      const { error } = await client.functions.invoke("gathering-token", {
        body: { gatheringId: id, action, participant, enabled },
      });
      if (error) throw error;
      if (action === "close") {
        await room.disconnect();
        router.back();
      }
    } catch {
      setNotice(l("roomUpdateError"));
    }
  }
  useEffect(() => {
    const timer = setTimeout(
      () => {
        void room.disconnect();
        router.back();
      },
      Math.max(0, Date.parse(access.endsAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [access.endsAt, room]);
  return (
    <>
      <Body>{l("audioIntro")}</Body>
      <Notice text={notice} />
      {permissions?.canPublish ? (
        <Button
          title={isMicrophoneEnabled ? l("micMute") : l("micEnable")}
          onPress={() => {
            void (async () => {
              if (!isMicrophoneEnabled) {
                const permission =
                  await AudioModule.requestRecordingPermissionsAsync();
                if (!permission.granted) {
                  setNotice(l("micDenied"));
                  return;
                }
              }
              await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
            })().catch(() => setNotice(l("micError")));
          }}
        />
      ) : (
        <Button
          title={raised ? l("handLower") : l("handRaise")}
          onPress={() => {
            void requireUser()
              .then(async ({ client }) => {
                const { error } = await client.rpc("raise_hand", {
                  p_gathering: id,
                  p_raised: !raised,
                });
                if (error) throw error;
                setRaised(!raised);
              })
              .catch(() => setNotice(l("handError")));
          }}
        />
      )}
      {participants.map((p) => (
        <Card key={p.identity}>
          <Body>
            {p.name || l("participant")}
            {p.isSpeaking ? " · " + l("speaking") : ""}
          </Body>
          {access.host && !p.isLocal && (
            <>
              <Button
                secondary
                title={
                  p.permissions?.canPublish
                    ? l("makeListener")
                    : l("allowSpeaking")
                }
                onPress={() =>
                  void command(
                    "speaker",
                    p.identity,
                    !p.permissions?.canPublish,
                  )
                }
              />
              <Button
                secondary
                title={l("removeParticipant")}
                onPress={() => void command("remove", p.identity)}
              />
            </>
          )}
        </Card>
      ))}
      {access.host && (
        <Button
          secondary
          title={l("endGathering")}
          onPress={() => void command("close")}
        />
      )}
      <Button
        title={l("leaveGathering")}
        onPress={() => {
          void room.disconnect();
          router.back();
        }}
      />
    </>
  );
}
export default function GatheringRoom({
  id,
  access,
}: {
  id: string;
  access: RoomAccess;
}) {
  const { profile } = useApp();
  const l = (key: string) => label(profile.language, key);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void AudioSession.startAudioSession()
      .then(() => {
        if (active) setReady(true);
      })
      .catch(() => {
        if (active) setError("audioStartError");
      });
    return () => {
      active = false;
      void AudioSession.stopAudioSession();
    };
  }, []);
  if (!ready) return <Notice text={l(error || "audioConnecting")} />;
  return (
    <LiveKitRoom
      serverUrl={access.url}
      token={access.token}
      connect
      audio={false}
      video={false}
      onError={() => setError("audioInterrupted")}
    >
      <Notice text={error ? l(error) : ""} />
      <Controls id={id} access={access} />
    </LiveKitRoom>
  );
}
