import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') {
  throw new Error('Build output must stay inside frontend/dist.');
}
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
  fs.cpSync(path.join(root, entry), path.join(output, entry), {
    recursive: true,
    filter: (source) => path.basename(source) !== '__refshots',
  });
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

// A new filename means a changed image. Browsers can safely keep old filenames forever.
const assetsDir = path.join(output, 'assets');
const assetNames = new Map();
function fingerprintAssets(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const sourcePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      fingerprintAssets(sourcePath);
      continue;
    }
    const digest = createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex').slice(0, 12);
    const { name, ext } = path.parse(entry.name);
    const hashedName = `${name}.${digest}${ext}`;
    fs.renameSync(sourcePath, path.join(directory, hashedName));
    const relativePath = path.relative(assetsDir, sourcePath).split(path.sep).join('/');
    const relativeHashedPath = path.posix.join(path.posix.dirname(relativePath), hashedName);
    assetNames.set(`assets/${relativePath}`, `assets/${relativeHashedPath}`);
  }
}
fingerprintAssets(assetsDir);

function updateAssetReferences(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      updateAssetReferences(filePath);
      continue;
    }
    if (!['.css', '.html', '.js'].includes(path.extname(entry.name))) continue;
    const original = fs.readFileSync(filePath, 'utf8');
    let updated = original;
    for (const [oldName, newName] of assetNames) updated = updated.replaceAll(oldName, newName);
    if (updated !== original) fs.writeFileSync(filePath, updated);
  }
}

updateAssetReferences(output);
console.log(`Built frontend/dist with ${assetNames.size} cacheable assets.`);
