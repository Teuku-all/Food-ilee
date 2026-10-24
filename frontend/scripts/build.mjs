import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const output = path.join(root, 'dist');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const excludedEntries = new Set([
  'dist',
  'node_modules',
  'scripts',
  'server.js',
  'package.json',
  'package-lock.json',
]);
for (const entry of fs.readdirSync(root)) {
  if (excludedEntries.has(entry)) continue;
  fs.cpSync(path.join(root, entry), path.join(output, entry), { recursive: true });
}

const apiBaseUrl = (process.env.FOODILEE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const socketUrl = (process.env.FOODILEE_SOCKET_URL || '').trim().replace(/\/+$/, '');
const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
const realtime = process.env.FOODILEE_REALTIME === 'true';
if (process.env.VERCEL && !apiBaseUrl) {
  throw new Error(
    'Set FOODILEE_API_BASE_URL in the Vercel frontend project (for example https://foodilee-api.vercel.app/api).',
  );
}
const config = { apiBaseUrl, socketUrl, googleClientId, realtime };
fs.writeFileSync(
  path.join(output, 'config.js'),
  `globalThis.FOODILEE_CONFIG = ${JSON.stringify(config)};\n`,
);
