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
  // Made a listener by the host: never speaks. A guest speaker always may;
  // others follow the gathering's rule.
  assert.match(token, /m\.speech_revoked\?false:m\.guest_speaker===true\|\|\(mode==='everyone'\|\|m\.can_speak===true\)/);
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
  // Only guest speakers are merely muted; everyone else loses the right to speak.
  assert.match(mute, /publishing\(false\)/);
  assert.match(mute, /update\(\{can_speak:false,hand_raised:false\}\)\.eq\('gathering_id',g\.id\)\.neq\('user_id',g\.host_id\)/);

});

test("the host sees raised hands, Mute everyone and the speaking rule in the room", () => {
  const room = read("mobile/src/components/RoomControls.tsx");
  // Raised hands come first, each with its own "Allow speaking".
  assert.match(room, /!p\.isLocal && audio\.hands\.includes\(p\.identity\)/);
  assert.match(room, /audio\.command\("speaker", p\.identity, true\)/);
  // Every person shows an icon for their state, with a short key.
  assert.match(room, /hand: "hand-left",\s*micOn: "mic",\s*micOff: "mic-off",\s*listening: "headset"/);
  assert.match(room, /audio\.command\("mute_all"\)/);
  // Mute everyone closes the floor; the one switch left opens it again.
  assert.match(room, /audio\.speakMode === "invited" && \(\s*<Button[\s\S]{0,200}audio\.command\("speak_mode", undefined, true\)/);
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

test("guest speakers can always speak, and the host controls who is one", () => {
  const migration = read("supabase/migrations/20261124120000_gathering_guest_speakers.sql");
  assert.match(migration, /guest_speaker boolean not null default false/);
  assert.match(migration, /speaker_token text/);
  const token = read("supabase/functions/gathering-token/index.ts");
  // Only the host makes the private link or changes someone's guest status.
  for (const action of ["speaker_link", "guest"]) {
    const start = token.indexOf(`body.action==='${action}'`);
    assert.ok(start > 0, action);
    assert.match(token.slice(start, start + 140), /if\(!host/);
  }
  // A valid link makes a guest on joining, unless the host made them a listener.
  assert.match(token, /link\.data\?\.token === body\.speaker\) \{[\s\S]{0,200}\.eq\('speech_revoked',false\)/);
  assert.doesNotMatch(token, /g\.speaker_token|update\(\{speaker_token/);
  const linkMigration = read("supabase/migrations/20261124091526_private_gathering_speaker_links.sql");
  assert.match(linkMigration, /enable row level security/);
  assert.match(linkMigration, /revoke all .* from public, anon, authenticated, service_role/);
  assert.match(linkMigration, /grant select, insert .* to service_role/);
  // Mute everyone mutes guests but leaves them guests; others become listeners.
  const mute = token.slice(token.indexOf("body.action==='mute_all'"), token.indexOf("body.action==='speaker_link'"));
  assert.match(mute, /if\(guests\.has\(p\.identity\)\)\{[\s\S]{0,240}mutePublishedTrack/);
  assert.match(mute, /updateParticipant\(g\.room_name,p\.identity,publishing\(false\)\)/);
  // Making someone a listener also ends their guest status.
  assert.match(token, /speech_revoked:true,hand_raised:false,guest_speaker:false/);
  const room = read("mobile/src/components/RoomControls.tsx");
  assert.match(room, /audio\.guests\.includes\(p\.identity\)\s*\?\s*\{ icon: "ribbon" as Icon, label: c\("guestSpeaker"\) \}/);
  assert.match(room, /audio\.command\(\s*"guest",/);
  assert.match(room, /c\("inviteGuestSpeaker"\)/);
  assert.match(read("mobile/src/app/gathering/[id].tsx"), /audio\.join\(id, invite, speaker\)/);
  assert.match(read("mobile/src/lib/gatherings.ts"), /speaker=" \+ encodeURIComponent\(speaker\)/);
});

test("the create form explains its fields and says what is missing", () => {
  const create = read("mobile/src/app/gathering/create.tsx");
  // The button is never silently disabled by the rules; it lists what is missing.
  assert.match(create, /disabled=\{busy\}/);
  assert.match(create, /if \(audioIssue \|\| missingFields\.length\) return;/);
  assert.match(create, /const missingFields = gatheringFieldsToCheck\(/);
  assert.match(create, /missingFields\.map\(c\)\.join/);
  assert.match(create, /<Notice text=\{error \|\| \(attempted && audioIssue\) \|\| validation\}/);
  // Field explanations, the description counter and topic suggestions.
  for (const key of ["titleHint", "descriptionHint", "descriptionCount", "topicHint", "hostNameHint", "topicPrayer"])
    assert.match(create, new RegExp(`"${key}"`), key);
  // Server messages are shown in the reader's language, next to the button.
  assert.match(create, /setError\(c\(serverProblem\(\(e as Error\)\.message\)\)\)/);
  const copy = read("mobile/src/lib/community-copy.ts");
  for (const key of ["micOff", "listenOnly", "tapPersonHint", "fixBeforeCreate", "badTimezone", "needFutureTime", "dailyLimit", "createFailed"])
    assert.match(copy, new RegExp(`\\n  ${key}: \\[`), key);
});
