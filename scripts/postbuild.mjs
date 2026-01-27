import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');
const notFoundPath = path.join(distDir, '404.html');

if (!fs.existsSync(indexPath)) {
  console.warn('No dist/index.html found; skipping 404.html copy.');
  process.exit(0);
}

fs.copyFileSync(indexPath, notFoundPath);
console.log('Copied dist/index.html to dist/404.html');
