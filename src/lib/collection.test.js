import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { ready } from './learning.js';
test('Every collection work has a numbered, nonempty image and is available to practice', async () => {
  const collection = JSON.parse(await readFile(new URL('./collection.json', import.meta.url), 'utf8'));
  const images = JSON.parse(await readFile(new URL('./images.json', import.meta.url), 'utf8'));
  const stats = JSON.parse(await readFile(new URL('./image-stats.json', import.meta.url), 'utf8'));
  assert.equal(collection.length, 170); assert.equal(Object.keys(images).length, 170);
  let bytes=0;
  for (const p of collection) { assert.equal(ready({...p,image:images[p.id]}),true, `Missing image: ${p.id}`); assert.match(images[p.id], new RegExp(`^paintings/${p.id}\\.(jpg|jpeg|png|webp)$`)); const s=await stat(new URL(`../../public/${images[p.id]}`,import.meta.url)); assert.ok(s.size>0); bytes+=s.size; }
  assert.equal(stats.imageCount,170); assert.equal(stats.totalBytes,bytes);
  assert.equal(images[168],'paintings/168.png');
});
