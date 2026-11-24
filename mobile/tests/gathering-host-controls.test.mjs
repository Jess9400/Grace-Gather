import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const read = (file) => readFileSync(repo + file, "utf8");

test("gatherings let only invited people speak unless the host opens the floor", () => {
  const migration = read("supabase/migrations/20261123120000_gathering_speak_mode.sql");
  assert.match(migration, /speak_mode text not null default 'invited'/);
  const token = read("supabase/functions/gathering-token/index.ts");
  // In 'invited' mode a member speaks only once the host allowed them.
  assert.match(token, /mode==='everyone'\?!m\.speech_revoked:m\.can_speak===true&&!m\.speech_revoked/);
  assert.match(token, /const canSpeak=host\|\|mayPublish\(speakMode\(g\),membership\.data\)/);
  // Only the host can change the rule or mute everyone; the host is never muted.
  for (const action of ["speak_mode", "mute_all"]) {
    const start = token.indexOf(`body.action==='${action}'`);
    assert.ok(start > 0, action);
    assert.match(token.slice(start, start + 120), /if\(!host\)return json\(\{error:'host_required'\},403\)/);
  }
  assert.match(token, /if\(p\.identity===g\.host_id\)continue;/);
  // Mute everyone means the same in every gathering: everyone but the host
  // goes back to listening, in the room and for their next join, and the
  // gathering becomes "Only people I allow" until the host opens it again.
  const mute = token.slice(token.indexOf("body.action==='mute_all'"), token.indexOf("if(['speaker','remove']"));
  assert.match(mute, /update\(\{speak_mode:'invited'\}\)\.eq\('id',g\.id\)/);
  assert.doesNotMatch(mute, /mutePublishedTrack/);
  assert.match(mute, /update\(\{can_speak:false,hand_raised:false\}\)\.eq\('gathering_id',g\.id\)\.neq\('user_id',g\.host_id\)/);
  assert.match(mute, /permission:\{canSubscribe:true,canPublish:false/);
});

test("the host sees raised hands, Mute everyone and the speaking rule in the room", () => {
  const room = read("mobile/src/components/RoomControls.tsx");
  assert.match(room, /audio\.hands\.includes\(p\.identity\)\)/);
  assert.match(room, /audio\.command\("mute_all"\)/);
  // Mute everyone closes the floor; the one switch left opens it again.
  assert.match(room, /audio\.speakMode === "invited" && \(\s*<Button[\s\S]{0,160}audio\.command\("speak_mode", undefined, true\)/);
  // A listener's hand follows the server: cleared by the host, it goes down.
  assert.match(read("supabase/functions/gathering-token/index.ts"), /raised:membership\.data\.some\(m=>m\.user_id===user\.id&&m\.hand_raised\)/);
  const audio = read("mobile/src/lib/audio-room.tsx");
  assert.match(audio, /if \(typeof data\.raised === "boolean"\) setRaised\(data\.raised\);/);
  assert.match(audio, /participant\.permissions\?\.canPublish\)\s*setRaised\(false\)/);
  const create = read("mobile/src/app/gathering/create.tsx");
  assert.match(create, /c\("whoCanSpeak"\)/);
  const copy = read("mobile/src/lib/community-copy.ts");
  for (const key of ["whoCanSpeak", "speakInvited", "speakEveryone", "muteEveryone", "mutedEveryone", "mutedToListeners", "speakInvitedNow", "speakEveryoneNow"])
    assert.match(copy, new RegExp(`\\n  ${key}: \\[`), key);
});
