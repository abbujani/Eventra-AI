/**
 * GitHub Pages cannot rewrite unknown paths to index.html. Serving the SPA
 * shell as 404.html gives deep links (`/events/123`) the same entry point as
 * `/`, and React Router takes over from the original URL.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const index = join(root, 'dist', 'index.html');
const notFound = join(root, 'dist', '404.html');

if (!existsSync(index)) {
  console.error('dist/index.html not found — run the Vite build first.');
  process.exit(1);
}

copyFileSync(index, notFound);
console.log('Created dist/404.html for GitHub Pages SPA deep links.');
