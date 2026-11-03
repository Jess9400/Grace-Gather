import { AccessToken, RoomServiceClient } from "npm:livekit-server-sdk@2.19.2";
import { serve, identity, json, env } from "../_shared/http.ts";
serve(async (req) => {
  const { user, client, service } = await identity(req);
  const body = await req.json();
  const { data: g, error } = await service
    .from("gatherings")
    .select("*")
    .eq("id", body.gatheringId)
    .maybeSingle();
  if (error) throw error;
  if (!g || g.status !== "published")
    return json({ error: "unavailable" }, 404);
  const host = g.host_id === user.id;
  const allowed = await client.rpc("participation_allowed");
  if (allowed.error || !allowed.data)
    return json({ error: "not_allowed" }, 403);
  const roomService = new RoomServiceClient(
    env("LIVEKIT_URL").replace("wss:", "https:"),
    env("LIVEKIT_API_KEY"),
    env("LIVEKIT_API_SECRET"),
  );
  if (body.action && body.action !== "join") {
    if (!host) return json({ error: "host_required" }, 403);
    if (body.action === "close") {
      await roomService.deleteRoom(g.room_name).catch(() => {});
      const { error } = await service
        .from("gatherings")
        .update({ status: "cancelled" })
        .eq("id", g.id);
      if (error) throw error;
      return json({ closed: true });
    }
    if (
      !["speaker", "remove"].includes(body.action) ||
      typeof body.participant !== "string"
    )
      return json({ error: "invalid_action" }, 400);
    const { data: member } = await service
      .from("memberships")
      .select("user_id")
      .eq("gathering_id", g.id)
      .eq("user_id", body.participant)
      .maybeSingle();
    if (!member) return json({ error: "participant_missing" }, 404);
    if (body.action === "remove") {
      await roomService.removeParticipant(g.room_name, body.participant);
      await service
        .from("memberships")
        .delete()
        .eq("gathering_id", g.id)
        .eq("user_id", body.participant);
      await service.rpc("ban_from_gathering", {
        p_gathering: g.id,
        p_user: body.participant,
      });
    } else {
      const canSpeak = body.enabled === true;
      await roomService.updateParticipant(g.room_name, body.participant, {
        permission: {
          canSubscribe: true,
          canPublish: canSpeak,
          canPublishData: false,
        },
      });
      const updated = await service
        .from("memberships")
        .update({ can_speak: canSpeak, hand_raised: false })
        .eq("gathering_id", g.id)
        .eq("user_id", body.participant);
      if (updated.error) throw updated.error;
    }
    return json({ updated: true });
  }
  const now = Date.now();
  if (now < Date.parse(g.starts_at) - 600000 || now >= Date.parse(g.ends_at))
    return json({ error: "outside_session_time" }, 409);
  const { data: membership } = await client
    .from("memberships")
    .select("can_speak")
    .eq("gathering_id", g.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!host && !membership) return json({ error: "reservation_required" }, 403);
  const banned = await service.rpc("is_gathering_banned", {
    p_gathering: g.id,
    p_user: user.id,
  });
  if (banned.error || banned.data) return json({ error: "not_allowed" }, 403);
  const token = new AccessToken(
    env("LIVEKIT_API_KEY"),
    env("LIVEKIT_API_SECRET"),
    { identity: user.id, name: host ? g.host_name : "Participant", ttl: "10m" },
  );
  token.addGrant({
    roomJoin: true,
    room: g.room_name,
    canSubscribe: true,
    canPublish: host || membership?.can_speak === true,
    canPublishData: false,
  });
  return json({
    token: await token.toJwt(),
    url: env("LIVEKIT_URL"),
    endsAt: g.ends_at,
    host,
    canSpeak: host || membership?.can_speak === true,
  });
});
