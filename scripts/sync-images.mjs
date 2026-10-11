import { readdir, readFile, writeFile } from 'node:fs/promises';
const files = (await readdir(new URL('../public/paintings/', import.meta.url))).filter(name => /^\d+\.(jpg|jpeg|png|webp)$/i.test(name)).sort();
const images = Object.fromEntries(files.map(name => [Number(name.split('.')[0]), `paintings/${name}`]));
const destination = new URL('../src/lib/images.json', import.meta.url);
const content = JSON.stringify(images, null, 2) + '\n';
let existing = '';
try { existing = await readFile(destination, 'utf8'); } catch {}
if (content !== existing) await writeFile(destination, content);
console.log(`Коллекция: ${files.length} изображений.`);
