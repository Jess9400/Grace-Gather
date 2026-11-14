import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function fixture() {
  let owner = "a-123";
  const files = new Map([["audio-1", Uint8Array.of(1, 2, 3)]]), values = new Map(), remote = new Map();
  const storage = {
    async getItem(k) { return values.get(k) ?? null; },
    async setItem(k, v) { values.set(k, v); },
    async removeItem(k) { values.delete(k); },
    async readJournalAudio(k) { if (!files.has(k)) throw Error("missing"); return files.get(k); },
    async writeJournalAudio(k, v) { files.set(k, v); },
    async removeAudio(k) { files.delete(k); },
  };
  const bucket = {
    async upload(path, bytes) { if (remote.has(path)) return {error: Error("exists")}; remote.set(path, new Uint8Array(bytes)); return {error: null}; },
    async download(path) { const bytes = remote.get(path); return bytes ? {data: new Blob([bytes]), error:null} : {data:null,error:Error("missing")}; },
    async remove(paths) { for (const path of paths) remote.delete(path); return {error:null}; },
  };
  const backend = {auth:{async getSession(){return {data:{session:{user:{id:owner}}},error:null};}},storage:{from(){return bucket;}}};
  const code = ts.transpileModule(readFileSync(new URL("../src/lib/account-journal-audio.ts", import.meta.url), "utf8"), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  const deps = {"./backend":{backend},"./account":{isMemberSession: (s) => !!s},"./storage":storage};
  new Function("require","exports","module",code)((name) => { if (!(name in deps)) throw Error(name); return deps[name]; },exports,{exports});
  return { api: exports, files, remote, switchOwner(value){owner=value;} };
}

test("audio uploads, restores under an account-specific cache, and rejects another account", async () => {
  const f = fixture();
  await f.api.uploadJournalAudio("a-123", "audio-1");
  assert.deepEqual(f.remote.get("a-123/audio-1.bin"), Uint8Array.of(1,2,3));
  assert.equal(await f.api.ensureJournalAudio("a-123", "audio-1"), "journal-a-123-audio-1");
  f.switchOwner("b-456");
  await assert.rejects(f.api.ensureJournalAudio("a-123", "audio-1"), /account_changed/);
  await assert.rejects(f.api.uploadJournalAudio("b-456", "audio-1"), /owner_conflict/);
});

test("audio deletion is scoped to the owner and clears its local copies", async () => {
  const f = fixture();
  await f.api.uploadJournalAudio("a-123", "audio-1");
  await f.api.ensureJournalAudio("a-123", "audio-1");
  await f.api.deleteJournalAudio("a-123", "audio-1");
  assert.equal(f.remote.size, 0);
  assert.equal(f.files.has("audio-1"), false);
  assert.equal(f.files.has("journal-a-123-audio-1"), false);
});
