import { serve, identity, json } from "../_shared/http.ts";
import { unseal, revokeApple } from "../_shared/apple.ts";
serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const { user, service } = await identity(req);
  if ((await req.json()).confirm !== "DELETE")
    return json({ error: "confirmation_required" }, 400);
  let appleRevokeRequired = !!user.identities?.some(
    (i) => i.provider === "apple",
  );
  const token = await service.rpc("read_apple_token", { p_user: user.id });
  if (token.error) throw token.error;
  if (token.data) {
    try {
      await revokeApple(await unseal(token.data));
      appleRevokeRequired = false;
    } catch {
      /* Account deletion must still be fulfilled if Apple's revocation service is unavailable. */
    }
  }
  // Remove owned objects through the Storage API before deleting the auth user.
  while (true) {
    const { data, error } = await service.storage
      .from("journal-backups")
      .list(user.id, { limit: 100 });
    if (error) throw error;
    if (!data?.length) break;
    const removed = await service.storage
      .from("journal-backups")
      .remove(data.map((x) => user.id + "/" + x.name));
    if (removed.error) throw removed.error;
  }
  // Confession media uses opaque IDs; remove owned recordings before cascading account rows.
  const confessions = await service.from("confessions").select("id").eq("author",user.id).not("audio_type","is",null);
  if(confessions.error) throw confessions.error;
  for(let i=0;i<(confessions.data?.length||0);i+=100){
    const removed=await service.storage.from("confession-audio").remove(confessions.data!.slice(i,i+100).map(x=>x.id));
    if(removed.error)throw removed.error;
  }
  const cancelled = await service
    .from("gatherings")
    .update({ status: "cancelled" })
    .eq("host_id", user.id);
  if (cancelled.error) throw cancelled.error;
  const { error } = await service.auth.admin.deleteUser(user.id, false);
  if (error) throw error;
  return json({ deleted: true, appleRevokeRequired });
});
