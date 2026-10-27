// Build a standalone browser version from the already packed Board output.
// Keep simulator scripts out of dist/ and the native .webapp.zip.
import { copyFileSync, cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const destination = join(root, 'web-dist');
const entry = join(dist, 'index.html');
const platformTag = /<script\b[^>]*\bid=["']board-platform["'][^>]*>\s*<\/script>/i;

if (!existsSync(entry) || !existsSync(join(dist, 'board-platform.js'))) {
  throw new Error('build:web needs packed dist/. Run npm run build:web, which runs npm run pack first.');
}
const html = readFileSync(entry, 'utf8');
if (!platformTag.test(html)) throw new Error('build:web could not find the packed Board platform script.');

rmSync(destination, { recursive: true, force: true });
cpSync(dist, destination, { recursive: true });
for (const filename of ['browser-host.js', 'player-selector.js']) {
  copyFileSync(join(root, 'dev', filename), join(destination, filename));
}
// Both adapters detect a real bridge and leave it alone. Plain scripts preserve
// order: simulated bridge, browser roster chooser, platform, then game module.
const adapters = '<script src="./browser-host.js"></script>\n<script src="./player-selector.js"></script>\n';
writeFileSync(join(destination, 'index.html'), html.replace(platformTag, tag => adapters + tag));
console.log('build:web: standalone browser game written to web-dist/ (native package unchanged).');
