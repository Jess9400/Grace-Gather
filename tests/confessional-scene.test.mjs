import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConfessionalMesh, doorProgress, DOOR_OPEN_MS } from '../mobile/src/lib/confessional-scene.ts';
import { CONFESSION_COPY } from '../dist/confession-copy.js';

test('door mesh has finite, normalized triangles and separate moving and fixed parts', () => {
  const mesh = buildConfessionalMesh();
  assert.equal(mesh.length % 33, 0);
  assert.ok(mesh.length > 1000);
  // Keep the scene small enough to upload once, including on older phones.
  assert.ok(mesh.byteLength < 1024 * 1024);
  const groups = new Set();
  for (let i = 0; i < mesh.length; i += 11) {
    const vertex = mesh.slice(i, i + 11);
    assert.ok(vertex.every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...vertex.slice(3, 6)) - 1) < 0.001);
    assert.ok(vertex.slice(6, 9).every(value => value >= 0 && value <= 1));
    assert.ok([0, 1, 2].includes(vertex[9]));
    assert.ok([0, 1].includes(vertex[10]));
    groups.add(vertex[10]);
  }
  assert.deepEqual([...groups].sort(), [0, 1]);
});

test('the door opens monotonically and finishes after a delayed frame without overshooting', () => {
  assert.equal(doorProgress(-100), 0);
  assert.equal(doorProgress(0), 0);
  assert.equal(doorProgress(DOOR_OPEN_MS), 1);
  assert.equal(doorProgress(DOOR_OPEN_MS * 10), 1);
  let previous = 0;
  for (let elapsed = 0; elapsed < DOOR_OPEN_MS; elapsed += 16) {
    const progress = doorProgress(elapsed);
    assert.ok(progress >= previous && progress <= 1);
    previous = progress;
  }
});

test('entrance, skip, and return-to-draft controls are translated in all four languages', () => {
  for (const language of ['en', 'pt', 'es', 'ru']) {
    for (const key of ['cDoorInvitation','cDoorHint','cDoorOpening','cDoorSkip','cReturnDraft']) {
      assert.ok(CONFESSION_COPY[language][key]?.trim(), `${language}:${key}`);
    }
  }
});
