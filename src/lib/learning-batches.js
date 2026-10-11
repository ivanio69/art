import { shuffle } from './learning.js';

export function learningBatch(queue, index) {
  const start = Math.floor(index / 5) * 5;
  const ids = queue.slice(start, start + 5);
  return { start, end: start + ids.length, ids };
}

export function nextLearningStep(queue, index, phase, random = Math.random) {
  const batch = learningBatch(queue, index);
  if (index + 1 < batch.end) return { index: index + 1, phase: phase === 'study' ? 'study' : 'recall' };
  if (phase === 'study') return { index: batch.start, phase: 'recall', recallOrder: shuffle(batch.ids, random) };
  return { index: batch.end, phase: 'study', recallOrder: [] };
}
