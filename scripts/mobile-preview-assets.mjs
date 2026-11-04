import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

export async function collectMobilePreview(root) {
  const assets = {};
  async function visit(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const path = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await visit(join(directory, entry.name), path);
      else if (entry.isFile() && types[extname(entry.name)]) {
        assets[path] = {
          type: types[extname(entry.name)],
          body: gzipSync(await readFile(join(directory, entry.name)), { level: 9 }).toString('base64'),
        };
      }
    }
  }
  await visit(root);
  if (!assets['/index.html']) throw new Error('Export the mobile web preview before building the Site.');
  return assets;
}
