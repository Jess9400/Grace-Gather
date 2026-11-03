import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConfessionalMesh, MESH_STRIDE, doorProgress, DOOR_OPEN_MS, SCENE_FADE_MS, THRESHOLD_MS, entranceFrame, ENTRANCE_MS, hingePoint, DOOR_HINGE } from '../mobile/src/lib/confessional-scene.ts';
import { confessionColors } from '../mobile/src/lib/confession-theme.ts';
import { CONFESSION_COPY } from '../dist/confession-copy.js';

test('mesh stays small, finite and normalized with separate door, metal and room materials', () => {
  const mesh = buildConfessionalMesh();
  assert.equal(mesh.length % (MESH_STRIDE * 3), 0);
  assert.ok(mesh.length > 1000 && mesh.byteLength < 1024 * 1024);
  const groups = new Set();
  for (let i = 0; i < mesh.length; i += MESH_STRIDE) {
    const v = mesh.slice(i, i + MESH_STRIDE);
    assert.ok(v.every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...v.slice(3, 6)) - 1) < 0.001);
    assert.ok(v.slice(6, 9).every(x => x >= 0 && x <= 1));
    assert.ok([0, 1, 2, 3].includes(v[9]));
    assert.ok([0, 1].includes(v[10]));
    assert.equal(v.length, MESH_STRIDE);
    assert.ok(v.slice(11).every(Number.isFinite));
    groups.add(v[10]);
  }
  assert.deepEqual([...groups].sort(), [0, 1]);
});

test('the hinge is fixed, the leaf swings inward and clears the back wall', () => {
  const mesh = buildConfessionalMesh();
  for (let p = 0; p <= 1; p += .05) {
    assert.deepEqual(hingePoint(DOOR_HINGE, p), DOOR_HINGE);
    const tip = hingePoint([.79, 0, .22], p);
    assert.ok(tip[2] <= .220001);
    assert.ok(Math.abs(Math.hypot(tip[0] + .79, tip[2] - .22) - 1.58) < .0001);
    for (let i = 0; i < mesh.length; i += MESH_STRIDE) {
      if (mesh[i + 10] !== 1) continue;
      const point = hingePoint([...mesh.slice(i, i + 3)], p);
      assert.ok(point[2] > -2.45, 'leaf must not intersect the back wall');
    }
  }
});

test('entrance fades in, opens gently, pauses, and overlaps a restrained approach with the crossfade', () => {
  assert.equal(ENTRANCE_MS, 2150);
  assert.deepEqual(entranceFrame(0), {open:0, approach:0, sceneOpacity:0, overlayOpacity:1});
  assert.equal(entranceFrame(SCENE_FADE_MS).sceneOpacity, 1);
  assert.equal(entranceFrame(SCENE_FADE_MS).open, 0);
  const threshold = SCENE_FADE_MS + DOOR_OPEN_MS;
  for (const time of [threshold, threshold + THRESHOLD_MS]) {
    assert.equal(entranceFrame(time).open, 1);
    assert.equal(entranceFrame(time).approach, 0);
    assert.equal(entranceFrame(time).overlayOpacity, 1);
  }
  assert.deepEqual(entranceFrame(ENTRANCE_MS * 20), {open:1, approach:1, sceneOpacity:1, overlayOpacity:0});
  let previous = 0;
  for (let time = -100; time < ENTRANCE_MS + 1000; time += 16) {
    const f = entranceFrame(time);
    assert.ok(Object.values(f).every(v => v >= 0 && v <= 1));
    assert.ok(f.open >= previous);
    if (f.approach > 0) assert.equal(f.open, 1);
    assert.equal(f.approach + f.overlayOpacity, 1);
    previous = f.open;
  }
  assert.equal(doorProgress(-100), 0);
  assert.equal(doorProgress(DOOR_OPEN_MS), 1);
});

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a,b) { const values = [luminance(a), luminance(b)].sort((a,b) => b-a); return (values[0]+.05)/(values[1]+.05); }
test('room copy, hints, input boundaries and primary controls have accessible contrast', () => {
  const c = confessionColors;
  for (const bg of [c.background, c.surface, c.field]) {
    assert.ok(contrast(c.ink, bg) >= 4.5);
    assert.ok(contrast(c.muted, bg) >= 4.5);
  }
  assert.ok(contrast(c.accentInk, c.accent) >= 4.5);
  assert.ok(contrast(c.line, c.field) >= 3);
});

test('entrance controls are translated in all four languages', () => {
  for (const language of ['en', 'pt', 'es', 'ru'])
    for (const key of ['cDoorInvitation','cDoorHint','cDoorOpening','cDoorSkip','cReturnDraft'])
      assert.ok(CONFESSION_COPY[language][key]?.trim(), `${language}:${key}`);
});
