import { useState } from "react";
import { View, Text, Share } from "react-native";
import { useAudioRoom } from "../lib/audio-room";
import { useApp } from "../lib/state";
import { communityCopy } from "../lib/community-copy";
import { gathering, gatheringLink } from "../lib/gatherings";
import { Button, Body, Row, Notice, colors } from "./community-ui";
import { Disclosure, TextAction } from "./CommunityControls";
export default function RoomControls() {
  const audio = useAudioRoom(),
    { profile } = useApp(),
    c = (k: string) => communityCopy(profile.language, k),
    [outputs, setOutputs] = useState<{ id: string; label: string }[]>([]),
    [end, setEnd] = useState(false),
    [error, setError] = useState("");
  const s = audio.session;
  if (!s) return null;
  async function invite() {
    try {
      const data = s!.access.host
        ? await gathering("invite", { id: s!.id })
        : { token: s!.invite };
      await Share.share({
        message: gatheringLink(s!.id, data.token ?? undefined),
      });
    } catch {
      setError("inviteError");
    }
  }
  return (
    <>
      <Body small>
        {c(audio.connection)} · {c("audioOnly")}
      </Body>
      <Notice text={c(audio.notice || error)} />
      {audio.playbackBlocked && (
        <Button
          title={c("enableSound")}
          onPress={() => void audio.startPlayback()}
        />
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {audio.participants.map((p) => (
          <View
            key={p.identity}
            style={{
              alignItems: "center",
              width: "30%",
              gap: 5,
              paddingVertical: 12,
            }}
          >
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                borderWidth: p.isSpeaking ? 3 : 1,
                borderColor: p.isSpeaking ? colors.green : colors.line,
                backgroundColor: "#FFFDF910",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.ink, fontSize: 22 }}>
                {(p.name || c("member")).slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text
              numberOfLines={2}
              style={{ color: colors.ink, fontSize: 14, textAlign: "center" }}
            >
              {p.name || c("member")}
              {p.isLocal ? " · " + c("you") : ""}
            </Text>
            <Body small>
              {c(
                p.identity === s.access.hostId
                  ? "host"
                  : p.permissions?.canPublish
                    ? "speaker"
                    : "listener",
              )}
              {p.isSpeaking ? " · " + c("speaking") : ""}
              {audio.hands.includes(p.identity) ? " ✋" : ""}
            </Body>
          </View>
        ))}
      </View>
      {audio.connection === "disconnected" ? (
        <Button
          title={c("rejoin")}
          disabled={audio.busy}
          onPress={() => void audio.join(s.id, s.invite)}
        />
      ) : (
        <Row>
          {audio.canSpeak ? (
            <Button
              title={c(audio.muted ? "unmute" : "mute")}
              disabled={audio.busy || audio.connection !== "connected"}
              onPress={() => void audio.mic()}
            />
          ) : (
            <Button
              title={c(audio.raised ? "lowerHand" : "raiseHand")}
              disabled={audio.connection !== "connected"}
              onPress={() => void audio.hand()}
            />
          )}
          <Button secondary title={c("invite")} onPress={() => void invite()} />
        </Row>
      )}
      <Disclosure
        title={c("audioOutput")}
        onToggle={() => {
          if (outputs.length) setOutputs([]);
          else
            void audio.outputs().then((x) => {
              setOutputs(x);
              if (!x.length) setError("systemAudioOutput");
            });
        }}
        open={outputs.length > 0}
      >
        {outputs.map((o) => (
          <TextAction
            key={o.id}
            title={o.label}
            icon="volume-high-outline"
            onPress={() => void audio.output(o.id)}
          />
        ))}
      </Disclosure>
      {s.access.host && (
        <Disclosure title={c("hostControls")}>
          {audio.participants
            .filter((p) => !p.isLocal)
            .map((p) => (
              <View key={p.identity} style={{ gap: 8 }}>
                <Body>
                  {p.name || c("member")}
                  {audio.hands.includes(p.identity)
                    ? " ✋ " + c("raisedHand")
                    : ""}
                </Body>
                <Button
                  secondary
                  disabled={audio.busy}
                  title={c(
                    p.permissions?.canPublish
                      ? "makeListener"
                      : "allowSpeaking",
                  )}
                  onPress={() =>
                    void audio.command(
                      "speaker",
                      p.identity,
                      !p.permissions?.canPublish,
                    )
                  }
                />
                <Button
                  secondary
                  disabled={audio.busy}
                  title={c("removeParticipant")}
                  onPress={() => void audio.command("remove", p.identity)}
                />
              </View>
            ))}
          {end ? (
            <>
              <Body>{c("endConfirm")}</Body>
              <Button
                title={c("endForEveryone")}
                disabled={audio.busy}
                onPress={() => void audio.command("close")}
              />
              <Button
                secondary
                title={c("cancel")}
                onPress={() => setEnd(false)}
              />
            </>
          ) : (
            <Button
              secondary
              title={c("endRoom")}
              onPress={() => setEnd(true)}
            />
          )}
        </Disclosure>
      )}
      <Button
        secondary
        title={c("leaveRoom")}
        onPress={() => void audio.leave()}
      />
      <Body small>{c("noRecording")}</Body>
    </>
  );
}
