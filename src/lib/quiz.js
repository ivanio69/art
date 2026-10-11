import { shuffle } from './learning.js';
import { normalize } from './matching.js';

export function makeOptions(painting, paintings, random = Math.random) {
  const identity = p => normalize(p.title) + '|' + normalize(p.author);
  const seen = new Set([identity(painting)]);
  const decoys = shuffle(paintings, random).filter(p => {
    const key = identity(p);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 3);
  return shuffle([painting, ...decoys], random);
}
