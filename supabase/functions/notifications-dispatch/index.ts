import { serve, json, admin, env } from "../_shared/http.ts";
import { RoomServiceClient } from "npm:livekit-server-sdk@2.19.2";
serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (
    req.headers.get("authorization") !==
    "Bearer " + env("NOTIFICATIONS_CRON_SECRET")
  )
    return json({ error: "unauthorized" }, 401);
  const service = admin();
  if (Deno.env.get("LIVEKIT_URL")) {
    const rooms = new RoomServiceClient(
      env("LIVEKIT_URL").replace("wss:", "https:"),
      env("LIVEKIT_API_KEY"),
      env("LIVEKIT_API_SECRET"),
    );
    const expired = await service
      .from("gatherings")
      .select("id,room_name")
      .eq("status", "published")
      .lte("ends_at", new Date().toISOString())
      .limit(100);
    if (expired.error) throw expired.error;
    for (const gathering of expired.data ?? []) {
      try {
        await rooms.deleteRoom(gathering.room_name);
      } catch (error) {
        if ((error as { code?: string }).code !== "not_found") throw error;
      }
      const ended = await service
        .from("gatherings")
        .update({ status: "ended" })
        .eq("id", gathering.id);
      if (ended.error) throw ended.error;
    }
  }
  const queued = await service.rpc("queue_gathering_reminders");
  if (queued.error) throw queued.error;
  const jobs = await service.rpc("claim_delivery_jobs");
  if (jobs.error) throw jobs.error;
  let sent = 0;
  for (const job of jobs.data ?? []) {
    let state = "cancelled";
    try {
      const { data: target, error } = await service.rpc("delivery_target", {
        p_job: job.id,
      });
      if (error) throw error;
      if (
        job.channel === "email" &&
        target?.email &&
        Deno.env.get("RESEND_API_KEY")
      ) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + env("RESEND_API_KEY"),
            "Content-Type": "application/json",
            "Idempotency-Key": job.id,
          },
          body: JSON.stringify({
            from: env("NOTIFICATION_FROM"),
            to: target.email,
            subject: job.subject,
            text:
              job.body +
              "\n\nTo stop email updates, turn off email consent in Away Church → Profile. Support: hello@awaychurch.com",
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error("delivery_failed");
        state = "sent";
      } else if (job.channel === "push" && target?.tokens?.length) {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(Deno.env.get("EXPO_ACCESS_TOKEN")
              ? { Authorization: "Bearer " + env("EXPO_ACCESS_TOKEN") }
              : {}),
          },
          body: JSON.stringify(
            target.tokens.map((to: string) => ({
              to,
              title: job.subject,
              body: job.body,
              data: { screen: "gatherings" },
            })),
          ),
          signal: AbortSignal.timeout(15000),
        });
        const result = await response.json();
        if (
          !response.ok ||
          result.errors?.length ||
          result.data?.some(
            (ticket: { status: string }) => ticket.status === "error",
          )
        )
          throw new Error("push_failed");
        state = "sent";
      }
    } catch {
      state = "failed";
    }
    const finished = await service.rpc("finish_delivery_job", {
      p_job: job.id,
      p_state: state,
    });
    if (finished.error) throw finished.error;
    if (state === "sent") sent++;
  }
  return json({ processed: jobs.data?.length ?? 0, sent });
});
