import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { createMobilePreview } from '../worker/mobile-preview.js';

const pack = (body, type) => ({ body: gzipSync(body).toString('base64'), type });
const image = Uint8Array.from([0xff, 0xd8, 0, 0x80, 0xff, 0xd9]);
const serve = createMobilePreview({
  '/index.html': pack('<html>mobile</html>', 'text/html; charset=utf-8'),
  '/assets/wood.jpg': pack(image, 'image/jpeg'),
  '/_expo/main.js': pack('console.log("preview")', 'text/javascript; charset=utf-8'),
  '/_expo/[id].js': pack('export default "entry"', 'text/javascript; charset=utf-8'),
});
const request = (path, method = 'GET') => new Request(`https://preview.example${path}`, { method });

test('mobile preview supports direct navigation without claiming the original app or API', async () => {
  for (const path of ['/app', '/app/', '/app/explore', '/app/confession?view=review', '/app/entry/entry-id']) {
    const response = serve(request(path));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '<html>mobile</html>');
  }
  for (const path of ['/', '/api/confessions', '/apple', '/app.js']) assert.equal(serve(request(path)), null);
});
test('binary textures are returned intact with their correct type', async () => {
  const response = serve(request('/app/assets/wood.jpg'));
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), image);
});
test('missing assets are 404, while HEAD has headers without a body', async () => {
  assert.equal(await serve(request('/app/_expo/%5Bid%5D.js')).text(), 'export default "entry"');
  assert.equal(serve(request('/app/%zz')).status, 400);
  for (const path of ['/app/assets/missing.jpg', '/app/_expo/missing', '/app/missing.js']) {
    assert.equal(serve(request(path)).status, 404);
  }
  const head = serve(request('/app/_expo/main.js', 'HEAD'));
  assert.match(head.headers.get('content-type'), /javascript/);
  assert.equal(await head.text(), '');
  assert.equal(serve(request('/app/confession', 'POST')).status, 405);
});
