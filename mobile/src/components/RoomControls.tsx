import { useState } from "react";
import { View, Text, Share, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Participant } from "livekit-client";
import { useAudioRoom } from "../lib/audio-room";
import { useApp } from "../lib/state";
import { communityCopy } from "../lib/community-copy";
import { gathering, gatheringLink, speakerInviteLink } from "../lib/gatherings";
import { Button, Body, Row, Notice, colors } from "./community-ui";
import { Disclosure, TextAction } from "./CommunityControls";

type Icon = keyof typeof Ionicons.glyphMap;
type Status = "hand" | "micOn" | "micOff" | "listening";
// One glyph per state, so who can speak is clear at a glance.
const statusIcon: Record<Status, Icon> = {
  hand: "hand-left",
  micOn: "mic",
  micOff: "mic-off",
  listening: "headset",
};
const statusLabel: Record<Status, string> = {
  hand: "raisedHand",
  micOn: "micOn",
  micOff: "micOff",
  listening: "listenOnly",
};

export default function RoomControls() {
  const audio = useAudioRoom(),
    { profile } = useApp(),
    c = (k: string) => communityCopy(profile.language, k),
    [outputs, setOutputs] = useState<{ id: string; label: string }[]>([]),
    [end, setEnd] = useState(false),
    [chosen, setChosen] = useState(""),
    [error, setError] = useState("");
  const s = audio.session;
  if (!s) return null;
  const host = s.access.host;
  async function inviteGuest() {
    try {
      await Share.share({ message: await speakerInviteLink(s!.id) });
    } catch {
      setError("inviteError");
    }
  }
  async function invite() {
    try {
      const data = host
        ? await gathering("invite", { id: s!.id })
        : { token: s!.invite };
      await Share.share({
        message: gatheringLink(s!.id, data.token ?? undefined),
      });
    } catch {
      setError("inviteError");
    }
  }
  const status = (p: Participant): Status =>
    audio.hands.includes(p.identity) || (p.isLocal && audio.raised)
      ? "hand"
      : !p.permissions?.canPublish
        ? "listening"
        : p.isMicrophoneEnabled
          ? "micOn"
          : "micOff";
  const role = (p: Participant) =>
    p.identity === s.access.hostId
      ? { icon: "star" as Icon, label: c("host") }
      : audio.guests.includes(p.identity)
        ? { icon: "ribbon" as Icon, label: c("guestSpeaker") }
        : null;
  const person = audio.participants.find(
    (p) => p.identity === chosen && !p.isLocal,
  );
  const asking = audio.participants.filter(
    (p) => !p.isLocal && audio.hands.includes(p.identity),
  );
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
      {/* Requests first, so nobody waits with a raised hand unseen. */}
      {host &&
        asking.map((p) => (
          <View
            key={p.identity}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.gold,
            }}
          >
            <Ionicons name="hand-left" size={18} color={colors.goldInk} />
            <Text style={{ flex: 1, color: colors.ink, fontSize: 15 }}>
              {p.name || c("member")} · {c("raisedHand")}
            </Text>
            <TextAction
              title={c("allowSpeaking")}
              disabled={audio.busy}
              onPress={() => void audio.command("speaker", p.identity, true)}
            />
          </View>
        ))}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {audio.participants.map((p) => {
          const now = status(p),
            badge = role(p),
            pickable = host && !p.isLocal;
          const name = (p.name || c("member")) + (p.isLocal ? " · " + c("you") : "");
          return (
            <Pressable
              key={p.identity}
              disabled={!pickable}
              accessibilityRole={pickable ? "button" : undefined}
              accessibilityLabel={[name, badge?.label, c(statusLabel[now])]
                .filter(Boolean)
                .join(", ")}
              onPress={() => setChosen(chosen === p.identity ? "" : p.identity)}
              style={{
                alignItems: "center",
                width: "30%",
                gap: 4,
                paddingVertical: 10,
                borderRadius: 16,
                backgroundColor:
                  chosen === p.identity ? "#F4EBDA14" : "transparent",
              }}
            >
              <View>
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
                <View
                  style={{
                    position: "absolute",
                    right: -4,
                    bottom: -2,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: now === "hand" ? colors.gold : colors.white,
                    borderWidth: 1,
                    borderColor: colors.line,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={statusIcon[now]}
                    size={13}
                    color={
                      now === "hand"
                        ? colors.paper
                        : now === "micOn"
                          ? colors.green
                          : colors.muted
                    }
                  />
                </View>
              </View>
              <Text
                numberOfLines={2}
                style={{ color: colors.ink, fontSize: 14, textAlign: "center" }}
              >
                {name}
              </Text>
              {badge && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name={badge.icon} size={12} color={colors.goldInk} />
                  <Text style={{ color: colors.goldInk, fontSize: 12 }}>
                    {badge.label}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {/* A short key, so the small icons need no guessing. */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 6 }}>
        {(["micOn", "micOff", "listening", "hand"] as Status[]).map((k) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name={statusIcon[k]} size={13} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {c(statusLabel[k])}
            </Text>
          </View>
        ))}
      </View>
      {host && !person && audio.participants.length > 1 && (
        <Body small>{c("tapPersonHint")}</Body>
      )}
      {host && person && (
        <View
          style={{
            gap: 8,
            padding: 14,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.line,
          }}
        >
          <Body>{person.name || c("member")}</Body>
          <Button
            secondary
            disabled={audio.busy}
            title={c(person.permissions?.canPublish ? "makeListener" : "allowSpeaking")}
            onPress={() =>
              void audio.command("speaker", person.identity, !person.permissions?.canPublish)
            }
          />
          <Button
            secondary
            disabled={audio.busy}
            title={c(
              audio.guests.includes(person.identity) ? "endGuestSpeaker" : "makeGuestSpeaker",
            )}
            onPress={() =>
              void audio.command("guest", person.identity, !audio.guests.includes(person.identity))
            }
          />
          <Button
            secondary
            disabled={audio.busy}
            title={c("removeParticipant")}
            onPress={() => {
              setChosen("");
              void audio.command("remove", person.identity);
            }}
          />
        </View>
      )}
      {audio.connection === "disconnected" ? (
        <Button
          title={c("rejoin")}
          disabled={audio.busy}
          onPress={() => void audio.join(s.id, s.invite, s.speaker)}
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
          <Button
            secondary
            title={c("leaveRoom")}
            onPress={() => void audio.leave()}
          />
        </Row>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        <TextAction title={c("invite")} icon="share-outline" onPress={() => void invite()} />
        {host && (
          <TextAction
            title={c("inviteGuestSpeaker")}
            icon="ribbon-outline"
            onPress={() => void inviteGuest()}
          />
        )}
      </View>
      {host && (
        <Disclosure title={c("hostControls")}>
          <Body small>
            {c(audio.speakMode === "everyone" ? "speakEveryoneNow" : "speakInvitedNow")}
          </Body>
          <Button
            secondary
            disabled={audio.busy}
            title={c("muteEveryone")}
            onPress={() => void audio.command("mute_all")}
          />
          {/* "Mute everyone" already closes the floor, so the only switch
              left is opening it again. */}
          {audio.speakMode === "invited" && (
            <Button
              secondary
              disabled={audio.busy}
              title={c("speakSwitchEveryone")}
              onPress={() => void audio.command("speak_mode", undefined, true)}
            />
          )}
          {end ? (
            <>
              <Body>{c("endConfirm")}</Body>
              <Button
                title={c("endForEveryone")}
                disabled={audio.busy}
                onPress={() => void audio.command("close")}
              />
              <Button secondary title={c("cancel")} onPress={() => setEnd(false)} />
            </>
          ) : (
            <Button secondary title={c("endRoom")} onPress={() => setEnd(true)} />
          )}
        </Disclosure>
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
      <Body small>{c("noRecording")}</Body>
    </>
  );
}
