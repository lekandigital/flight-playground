import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, extname, join, isAbsolute } from 'node:path';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let path = resolve(root, '.' + pathname);
    const inside = relative(root, path);
    if (inside === '..' || inside.startsWith('../') || inside.startsWith('..\\') || isAbsolute(inside)) { res.writeHead(403); res.end(); return; }
    let info = await stat(path);
    if (info.isDirectory()) { path = join(path, 'index.html'); info = await stat(path); }
    if (!info.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = createReadStream(path); stream.on('error', () => res.destroy()); stream.pipe(res);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, host, () => console.log(`Flight Playground: http://${host}:${port}`));
