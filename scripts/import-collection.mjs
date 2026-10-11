import { readdir, readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseMetadata } from '../src/lib/import.js';
const folder = process.argv[2];
if (!folder) { console.error('Укажите папку: npm run import:collection -- /путь/к/pic [подписи.csv]'); process.exit(1); }
await mkdir('public/paintings', { recursive: true });
const filenames = await readdir(folder);
let count = 0;
for (const name of filenames.filter(name => /^\d+\.(jpg|jpeg|png|webp)$/i.test(name))) { await copyFile(resolve(folder, name), resolve('public/paintings', name)); count++; }
if (process.argv[3]) {
 const metadata = parseMetadata(await readFile(process.argv[3], 'utf8'));
 const existing = JSON.parse(await readFile('src/lib/collection.json', 'utf8'));
 const map = new Map(existing.map(p => [p.id, p])); metadata.forEach(p => map.set(p.id, { ...map.get(p.id), ...p }));
 await writeFile('src/lib/collection.json', JSON.stringify([...map.values()], null, 2));
} else if (filenames.includes('list.txt')) {
 await copyFile(resolve(folder, 'list.txt'), resolve('public/list.txt'));
 const run = spawnSync('python3', ['scripts/prepare-list.py'], { stdio: 'inherit' });
 if (run.status !== 0) process.exit(run.status || 1);
}
const existing = JSON.parse(await readFile('src/lib/collection.json', 'utf8'));
const publicFiles = await readdir('public/paintings');
for (const p of existing) { const filename = publicFiles.find(name => Number(name.slice(0, -extname(name).length)) === p.id); if (filename) p.image = `paintings/${filename}`; }
await writeFile('src/lib/collection.json', JSON.stringify(existing, null, 2));
console.log(`Изображений подключено: ${count}. Пересоберите приложение: npm run build`);
