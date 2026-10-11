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
test('Blind exam resumes its remaining questions and rejects invalid timer state', () => {
  const exam = { mode: 'exam', blind: true, startedAt: 1000, deadline: 10000, queue: [1, 2], snapshot: { index: 1, answer: null, results: [{ id: 1, correct: false }], written: { author: 'Автор', title: 'Название' }, optionIds: [] } };
  assert.equal(validSession(exam, ids), true);
  assert.equal(validSession({ ...exam, deadline: 'tomorrow' }, ids), false);
  assert.equal(validSession({ ...exam, snapshot: { ...exam.snapshot, answer: { id: 2, correct: false } } }, ids), false);
});
test('History and error analysis round-trip in backups, malformed history is rejected', () => {
  const backup = { schema: 'art-memory', version: 1, progress: {}, activity: {}, history: [{ runId: 'run-1', date: 100, mode: 'exam', total: 1, correct: 0, seconds: 30, results: [{ id: 1, correct: false, written: { author: '', title: '' } }] }], errors: { 1: { author: 0, title: 0, skipped: 1, confusedWith: {} } } };
  assert.deepEqual(parseBackup(backup, ids).history, backup.history);
  assert.deepEqual(parseBackup(backup, ids).errors, backup.errors);
  assert.throws(() => parseBackup({ ...backup, history: [{ ...backup.history[0], correct: 2 }] }, ids));
  assert.throws(() => parseBackup({ ...backup, errors: { 1: { author: -1 } } }, ids));
});
