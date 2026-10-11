import test from 'node:test';
import assert from 'node:assert/strict';
import { learningBatch, nextLearningStep } from './learning-batches.js';

test('All five works are studied before shuffled recall starts', () => {
  const queue = [1, 2, 3, 4, 5, 6, 7];
  for (let index = 0; index < 4; index++) assert.deepEqual(nextLearningStep(queue, index, 'study'), { index: index + 1, phase: 'study' });
  const recall = nextLearningStep(queue, 4, 'study', () => 0);
  assert.equal(recall.index, 0);
  assert.equal(recall.phase, 'recall');
  assert.notDeepEqual(recall.recallOrder, queue.slice(0, 5));
  assert.deepEqual([...recall.recallOrder].sort(), queue.slice(0, 5));
  assert.deepEqual(nextLearningStep(queue, 0, 'feedback'), { index: 1, phase: 'recall' });
  assert.deepEqual(nextLearningStep(queue, 4, 'feedback'), { index: 5, phase: 'study', recallOrder: [] });
});
test('Short final batches and single-work gallery lessons finish correctly', () => {
  const queue = [1, 2, 3, 4, 5, 6, 7];
  assert.deepEqual(learningBatch(queue, 5), { start: 5, end: 7, ids: [6, 7] });
  assert.deepEqual(nextLearningStep(queue, 6, 'study', () => 0), { index: 5, phase: 'recall', recallOrder: [7, 6] });
  assert.equal(nextLearningStep(queue, 6, 'feedback').index, queue.length);
  assert.deepEqual(nextLearningStep([1], 0, 'study'), { index: 0, phase: 'recall', recallOrder: [1] });
  assert.equal(nextLearningStep([1], 0, 'feedback').index, 1);
});
