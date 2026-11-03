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
      setNotice("Could not update the gathering. Please try again.");
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
      <Body>
        Audio conversation · microphone off until you choose to speak.
      </Body>
      <Notice text={notice} />
      {permissions?.canPublish ? (
        <Button
          title={isMicrophoneEnabled ? "Mute microphone" : "Turn on microphone"}
          onPress={() => {
            void (async () => {
              const permission =
                await AudioModule.requestRecordingPermissionsAsync();
              if (!permission.granted) {
                setNotice("Microphone access was not granted.");
                return;
              }
              await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
            })().catch(() => setNotice("Could not enable your microphone."));
          }}
        />
      ) : (
        <Button
          title={raised ? "Lower hand" : "Raise hand to speak"}
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
              .catch(() => setNotice("Could not update your hand."));
          }}
        />
      )}
      {participants.map((p) => (
        <Card key={p.identity}>
          <Body>
            {p.name || "Participant"}
            {p.isSpeaking ? " · speaking" : ""}
          </Body>
          {access.host && !p.isLocal && (
            <>
              <Button
                secondary
                title={
                  p.permissions?.canPublish ? "Make listener" : "Allow to speak"
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
                title="Remove participant"
                onPress={() => void command("remove", p.identity)}
              />
            </>
          )}
        </Card>
      ))}
      {access.host && (
        <Button
          secondary
          title="End gathering for everyone"
          onPress={() => void command("close")}
        />
      )}
      <Button
        title="Leave gathering"
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
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void AudioSession.startAudioSession()
      .then(() => {
        if (active) setReady(true);
      })
      .catch(() => setError("Audio could not start."));
    return () => {
      active = false;
      void AudioSession.stopAudioSession();
    };
  }, []);
  if (!ready) return <Notice text={error || "Connecting audio…"} />;
  return (
    <LiveKitRoom
      serverUrl={access.url}
      token={access.token}
      connect
      audio={false}
      video={false}
      onError={() => setError("The audio connection was interrupted.")}
    >
      <Notice text={error} />
      <Controls id={id} access={access} />
    </LiveKitRoom>
  );
}
