import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
const files = (await readdir(new URL('../public/paintings/', import.meta.url))).filter(name => /^\d+\.(jpg|jpeg|png|webp)$/i.test(name)).sort();
const images = Object.fromEntries(files.map(name => [Number(name.split('.')[0]), `paintings/${name}`]));
if (Object.keys(images).length !== files.length) throw new Error('Есть разные изображения с одинаковым номером. Оставьте один файл для каждой работы.');
const destination = new URL('../src/lib/images.json', import.meta.url);
const content = JSON.stringify(images, null, 2) + '\n';
let existing = '';
try { existing = await readFile(destination, 'utf8'); } catch {}
if (content !== existing) await writeFile(destination, content);
const totalBytes = (await Promise.all(files.map(name => stat(new URL(`../public/paintings/${name}`, import.meta.url))))).reduce((sum, s) => sum + s.size, 0);
const statsPath = new URL('../src/lib/image-stats.json', import.meta.url);
const stats = JSON.stringify({ imageCount: files.length, totalBytes }, null, 2) + '\n';
let previousStats = ''; try { previousStats = await readFile(statsPath, 'utf8'); } catch {}
if (stats !== previousStats) await writeFile(statsPath, stats);
console.log(`Коллекция: ${files.length} изображений.`);
