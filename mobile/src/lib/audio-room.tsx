import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { Room, RoomEvent, ConnectionState, Participant } from "livekit-client";
import * as platform from "./audio/platform";
import { audioCommand, gathering } from "./gatherings";
import { Localized } from "./content";
import { backend } from "./backend";
interface Access {
  token: string;
  url: string;
  endsAt: string;
  host: boolean;
  hostId: string;
  canSpeak: boolean;
  title: Localized;
}
interface Session {
  id: string;
  invite?: string;
  access: Access;
  room: Room;
}
interface AudioContext {
  session: Session | null;
  participants: Participant[];
  connection: string;
  notice: string;
  hands: string[];
  raised: boolean;
  muted: boolean;
  canSpeak: boolean;
  busy: boolean;
  playbackBlocked: boolean;
  join: (id: string, invite?: string) => Promise<void>;
  leave: () => Promise<void>;
  mic: () => Promise<void>;
  hand: () => Promise<void>;
  command: (
    action: string,
    participant?: string,
    enabled?: boolean,
  ) => Promise<void>;
  startPlayback: () => Promise<void>;
  outputs: () => Promise<{ id: string; label: string }[]>;
  output: (id: string) => Promise<void>;
}
const Context = createContext<AudioContext | null>(null);
export function AudioRoomProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [connection, setConnection] = useState("disconnected"),
    [notice, setNotice] = useState(""),
    [hands, setHands] = useState<string[]>([]),
    [raised, setRaised] = useState(false),
    [busy, setBusy] = useState(false),
    [, refresh] = useState(0);
  const current = useRef<Session | null>(null),
    cleanup = useRef(() => {}),
    generation = useRef(0);
  async function leave() {
    const old = current.current;
    generation.current++;
    current.current = null;
    setSession(null);
    setConnection("disconnected");
    setRaised(false);
    setHands([]);
    cleanup.current();
    cleanup.current = () => {};
    try {
      await old?.room.disconnect(true);
    } finally {
      await platform.stopAudio();
    }
    if (old) void gathering("leave", { id: old.id }).catch(() => {});
  }
  async function join(id: string, invite?: string) {
    if (busy) return;
    if (
      current.current?.id === id &&
      current.current.room.state !== ConnectionState.Disconnected
    )
      return;
    setBusy(true);
    setNotice("");
    await leave();
    const version = ++generation.current;
    setConnection("connecting");
    let room: Room | undefined;
    try {
      const access: Access = await audioCommand("join", {
        gatheringId: id,
        invite,
      });
      if (version !== generation.current) return;
      await platform.startAudio();
      if (version !== generation.current) {
        await platform.stopAudio();
        return;
      }
      room = new Room({
        adaptiveStream: false,
        dynacast: false,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const s = { id, invite, access, room };
      current.current = s;
      setSession(s);
      const detach = platform.attachAudio(room);
      const update = () => refresh((v) => v + 1);
      const state = (state: ConnectionState) => {
        setConnection(state);
        update();
      };
      const disconnected = () => {
        setConnection("disconnected");
        setNotice("roomDisconnected");
        void platform.stopAudio();
      };
      room
        .on(RoomEvent.ConnectionStateChanged, state)
        .on(RoomEvent.ParticipantConnected, update)
        .on(RoomEvent.ParticipantDisconnected, update)
        .on(RoomEvent.ActiveSpeakersChanged, update)
        .on(RoomEvent.TrackMuted, update)
        .on(RoomEvent.TrackUnmuted, update)
        .on(RoomEvent.ParticipantPermissionsChanged, update)
        .on(RoomEvent.LocalTrackPublished, update)
        .on(RoomEvent.LocalTrackUnpublished, update)
        .on(RoomEvent.AudioPlaybackStatusChanged, update)
        .on(RoomEvent.Disconnected, disconnected);
      cleanup.current = () => {
        detach();
        room?.removeAllListeners();
      };
      await room.connect(access.url, access.token, { autoSubscribe: true });
      if (version !== generation.current) {
        await room.disconnect(true);
        return;
      }
      setConnection(room.state);
      update();
    } catch (e) {
      if (version === generation.current) {
        await room?.disconnect(true);
        cleanup.current();
        current.current = null;
        setSession(null);
        setConnection("disconnected");
        await platform.stopAudio().catch(() => {});
        setNotice(e instanceof Error ? e.message : "audioUnavailable");
      }
    } finally {
      setBusy(false);
    }
  }
  const leaveRef = useRef(leave);
  useEffect(() => {
    leaveRef.current = leave;
  });
  useEffect(() => {
    const s = backend?.auth.onAuthStateChange((_event, auth) => {
      if (!auth) setTimeout(() => void leaveRef.current(), 0);
    });
    return () => {
      s?.data.subscription.unsubscribe();
      void leaveRef.current();
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    let active = true;
    const poll = async () => {
      try {
        const data = await audioCommand("state", { gatheringId: session.id });
        if (active) setHands(data.hands ?? []);
      } catch (e) {
        if (active && (e as Error).message === "ended") {
          await leaveRef.current();
          setNotice("ended");
        }
      }
    };
    const poller = setInterval(() => void poll(), 10000);
    void poll();
    const end = setTimeout(
      () => {
        void leaveRef.current();
        setNotice("ended");
      },
      Math.max(0, Date.parse(session.access.endsAt) - Date.now()),
    );
    return () => {
      active = false;
      clearInterval(poller);
      clearTimeout(end);
    };
  }, [session]);
  async function mic() {
    const room = current.current?.room;
    if (!room || busy) return;
    setBusy(true);
    setNotice("");
    try {
      if (
        !room.localParticipant.isMicrophoneEnabled &&
        !(await platform.allowMicrophone())
      ) {
        setNotice("micDenied");
        return;
      }
      await room.localParticipant.setMicrophoneEnabled(
        !room.localParticipant.isMicrophoneEnabled,
      );
      refresh((v) => v + 1);
    } catch (e) {
      setNotice(
        (e as Error).name === "NotAllowedError" ? "micDenied" : "micError",
      );
    } finally {
      setBusy(false);
    }
  }
  async function hand() {
    if (!current.current || !backend) return;
    const r = await backend.rpc("raise_hand", {
      p_gathering: current.current.id,
      p_raised: !raised,
    });
    if (r.error) setNotice("handError");
    else setRaised((v) => !v);
  }
  async function command(
    action: string,
    participant?: string,
    enabled?: boolean,
  ) {
    if (!current.current) return;
    setBusy(true);
    try {
      await audioCommand(action, {
        gatheringId: current.current.id,
        participant,
        enabled,
      });
      if (action === "close") {
        await leave();
        setNotice("ended");
      }
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const room = session?.room;
  const participants =
    room && connection !== "disconnected"
      ? [room.localParticipant, ...room.remoteParticipants.values()]
      : [];
  return (
    <Context.Provider
      value={{
        session,
        participants,
        connection,
        notice,
        hands,
        raised,
        busy,
        muted: !room?.localParticipant.isMicrophoneEnabled,
        canSpeak: !!room?.localParticipant.permissions?.canPublish,
        playbackBlocked: !!room && !room.canPlaybackAudio,
        join,
        leave,
        mic,
        hand,
        command,
        startPlayback: async () => {
          try {
            await room?.startAudio();
            refresh((v) => v + 1);
          } catch {
            setNotice("audioUnavailable");
          }
        },
        outputs: platform.outputs,
        output: async (id) => {
          try {
            if (room) await platform.selectOutput(room, id);
          } catch {
            setNotice("outputError");
          }
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAudioRoom() {
  const value = useContext(Context);
  if (!value) throw Error("AudioRoomProvider missing");
  return value;
}
