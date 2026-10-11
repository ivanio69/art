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
test('Learning sessions preserve phase and draft without implying an exam result', () => {
  const saved = {mode:'learn',queue:[1,2],snapshot:{index:1,phase:'recall',written:{author:'Автор',title:''}}};
  assert.equal(validSession(saved,ids),true);
  assert.equal(validSession({...saved,snapshot:{...saved.snapshot,phase:'invalid'}},ids),false);
  assert.equal(validSession({...saved,deadline:100},ids),false);
});
test('Shuffled learning order and unconfirmed quiz selections survive backups', () => {
  const lesson = { mode: 'learn', queue: [1, 2, 3, 4], snapshot: { index: 1, phase: 'recall', recallOrder: [4, 2, 1, 3], written: { author: '', title: 'Черновик' } } };
  assert.equal(validSession(lesson, ids), true);
  assert.equal(validSession({ ...lesson, snapshot: { ...lesson.snapshot, recallOrder: [1, 1, 3, 4] } }, ids), false);
  assert.equal(validSession({ ...lesson, snapshot: { ...lesson.snapshot, recallOrder: [1, 2] } }, ids), false);
  const quiz = { ...saved, snapshot: { ...saved.snapshot, answer: null, selectedId: 3, results: [] } };
  assert.equal(validSession(quiz, ids), true);
  assert.equal(validSession({ ...quiz, snapshot: { ...quiz.snapshot, selectedId: 99 } }, ids), false);
  const backup = { schema: 'art-memory', version: 1, progress: {}, activity: {}, savedSession: quiz };
  assert.deepEqual(parseBackup(backup, ids).savedSession, quiz);
});
test('Quiz fields survive backups and legacy sessions keep combined cards', () => {
  const backup = { schema: 'art-memory', version: 1, progress: {}, activity: {} };
  assert.equal(parseBackup(backup, ids).settings.quizField, 'both');
  for (const field of ['both', 'author', 'title']) {
    const session = { ...saved, quizField: field };
    const data = parseBackup({ ...backup, settings: { quizField: field }, savedSession: session }, ids);
    assert.equal(data.settings.quizField, field);
    assert.equal(data.savedSession.quizField, field);
  }
  assert.equal(validSession({ ...saved, quizField: 'bad' }, ids), false);
  assert.throws(() => parseBackup({ ...backup, settings: { quizField: 'bad' } }, ids));
});
