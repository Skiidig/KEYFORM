import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../dist/', import.meta.url));
const port = 4185;
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
};

await stat(resolve(root, 'index.html'));
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let entry;
  let size;
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    entry = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!entry.startsWith(resolve(root) + sep)) throw new Error('Outside dist');
    const info = await stat(entry);
    if (!info.isFile()) throw new Error('Expected a file');
    size = info.size;
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  response.writeHead(200, {
    'Content-Type': contentTypes[extname(entry)] ?? 'application/octet-stream',
    'Content-Length': size,
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') response.end();
  else createReadStream(entry).on('error', () => response.destroy()).pipe(response);
});

server.on('error', (error) => {
  console.error(`Cannot start KEYFORM preview on 127.0.0.1:${port}: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Serving dist at http://127.0.0.1:${port}/`));
