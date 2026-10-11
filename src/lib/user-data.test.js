import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup, validSession } from './user-data.js';
const ids = new Set([1, 2, 3, 4]);
const saved = { mode: 'quiz', queue: [1, 2], snapshot: { index: 0, answer: { id: 1, correct: true, selectedId: 1 }, written: { author: '', title: '' }, results: [{ id: 1, correct: true }], optionIds: [1, 2, 3, 4] } };
test('Saved answered question resumes without requiring another review', () => {
  assert.equal(validSession(saved, ids), true);
  assert.equal(validSession({ ...saved, snapshot: { ...saved.snapshot, results: [] } }, ids), false);
  assert.equal(validSession({ ...saved, queue: [99] }, ids), false);
});
test('Legacy backups preserve progress without claiming exam mastery', () => {
  const backup = { schema: 'art-memory', version: 1, progress: { 1: { attempts: 3, correct: 3, errors: 0, streak: 3, due: 0, last: 0 } }, activity: {} };
  const data = parseBackup(backup, ids);
  assert.deepEqual(data.examProgress, {});
  assert.deepEqual(data.quizProgress, backup.progress);
  assert.throws(() => parseBackup({ ...backup, progress: { 1: { attempts: -1 } } }, ids));
});
