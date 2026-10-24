import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = path.dirname(fileURLToPath(import.meta.url));
const servingBuild = process.argv.includes('--dist');
const root = servingBuild ? path.join(sourceRoot, 'dist') : sourceRoot;
const port = Number(process.env.FRONTEND_PORT || 5501);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.resolve(root, `.${requestedPath}`);

    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    const contents = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg', '.ico'].includes(extension);
    const isHashedAsset =
      servingBuild && requestedPath.startsWith('/assets/') && /\.[a-f0-9]{12}\.[^.]+$/i.test(filePath);
    const cacheControl = isHashedAsset
      ? 'public, max-age=31536000, immutable'
      : isImage
        ? 'public, max-age=0, must-revalidate'
        : 'no-store';
    const etag = isImage ? `"${createHash('sha256').update(contents).digest('hex')}"` : null;
    const headers = {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': cacheControl,
    };
    if (etag) headers.ETag = etag;
    if (etag && request.headers['if-none-match'] === etag) {
      response.writeHead(304, headers).end();
      return;
    }
    response.writeHead(200, headers);
    response.end(contents);
  } catch (error) {
    const status = error.code === 'ENOENT' ? 404 : 500;
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(status === 404 ? 'Not found' : 'Unable to load frontend file');
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${port} sudah dipakai. Jalankan dengan FRONTEND_PORT=5502 untuk memakai port lain.`,
    );
  } else {
    console.error('Frontend gagal dijalankan:', error.message);
  }
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Food Ilee frontend running at http://localhost:${port}`);
});
