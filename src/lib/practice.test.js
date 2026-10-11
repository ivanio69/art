import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyQueue, summarizeErrors, remainingSeconds, unansweredResults, appendHistory } from './practice.js';
const paintings = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, title: `Work ${i}`, author: 'Author', image: 'image.jpg' }));
test('Daily practice prioritizes errors and keeps a stable order', () => {
  const progress = { 8: { attempts: 1, streak: 0 }, 3: { attempts: 4, streak: 4, due: Infinity } };
  const queue = dailyQueue(paintings, progress, 10, '2026-10-11');
  assert.equal(queue[0], 8);
  assert.equal(queue.includes(3), false);
  assert.deepEqual(queue, dailyQueue(paintings, progress, 10, '2026-10-11'));
  assert.equal(new Set(queue).size, 10);
});
test('Error analysis distinguishes titles, authors, confusion and skips', () => {
  const errors = summarizeErrors([{ id: 1, correct: false, author: { accepted: false }, title: { accepted: true } }, { id: 2, correct: false, selectedId: 3 }, { id: 4, correct: false }]);
  assert.equal(errors[1].author, 1); assert.equal(errors[1].title, 0);
  assert.equal(errors[2].confusedWith[3], 1); assert.equal(errors[4].skipped, 1);
});
test('Persisted deadlines continue across reloads and never go negative', () => {
  assert.equal(remainingSeconds(10000, 1500), 9);
  assert.equal(remainingSeconds(10000, 11000), 0);
  assert.equal(remainingSeconds(null), null);
});
test('Timeout records only unanswered work, never previously submitted answers', () => {
  assert.deepEqual(unansweredResults([1, 2, 3], [{ id: 1, correct: true }]), [{ id: 2, correct: false, timedOut: true }, { id: 3, correct: false, timedOut: true }]);
  assert.deepEqual(unansweredResults([1], [{ id: 1, correct: false }]), []);
});
test('Completed sessions are deduplicated and history leaves space for progress', () => {
  const entry = { runId: 'one' };
  assert.deepEqual(appendHistory([entry], entry), [entry]);
  assert.equal(appendHistory(Array.from({length:100}, (_,i) => ({runId:String(i)})), entry).length, 100);
  assert.equal(appendHistory([{runId:'old',answer:'x'.repeat(1000000)}], entry).length, 1);
});
