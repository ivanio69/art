import { shuffle } from './learning.js';
import { normalize } from './matching.js';

export const quizFields = { both: 'Автор и название', author: 'Только автор', title: 'Только название' };
export const quizIdentity = (painting, field = 'both') => field === 'author' ? normalize(painting.author) : field === 'title' ? normalize(painting.title) : normalize(painting.title) + '|' + normalize(painting.author);
export const quizEligible = (painting, field) => field !== 'author' || painting.authorRequired !== false && Boolean(painting.author?.trim());

export function makeOptions(painting, paintings, random = Math.random, preferredIds = [], field = 'both') {
  const identity = p => quizIdentity(p, field);
  const seen = new Set([identity(painting)]);
  const pool = shuffle(paintings, random).sort((a, b) => Number(preferredIds.includes(b.id)) - Number(preferredIds.includes(a.id)));
  const decoys = pool.filter(p => {
    if (!quizEligible(p, field)) return false;
    const key = identity(p);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 3);
  return shuffle([painting, ...decoys], random);
}
