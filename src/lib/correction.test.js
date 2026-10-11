import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCorrection, canCorrect } from './correction.js';
import { review } from './learning.js';
const before = review(review(review({}, true, false, 1), true, false, 2), true, false, 3);
const result = { id: 1, correct: false, before: { overall: before, exam: before }, reviewedAt: 10, reviewedDay: '2026-10-11', author: { accepted: false }, title: { accepted: true }, written: { author: 'author', title: 'title' } };
const data = () => ({ progress: {1: review(before, false, false, 10)}, examProgress: {1: review(before, false, false, 10)}, quizProgress: {}, activity: {'2026-10-11': {attempts: 1, correct: 0}}, history: [], errors: {} });
test('Manual correction replaces the rejected review, preserving attempts and the previous streak', () => {
  const corrected = applyCorrection(data(), {mode:'exam',runId:'run'}, result);
  assert.deepEqual(corrected.examProgress[1], review(before, true, false, 10));
  assert.equal(corrected.examProgress[1].attempts, 4); assert.equal(corrected.examProgress[1].streak, 4);
  assert.equal(corrected.activity['2026-10-11'].attempts, 1); assert.equal(corrected.activity['2026-10-11'].correct, 1);
  assert.equal(applyCorrection(corrected, {mode:'exam',runId:'run'}, result), corrected);
});
test('Final exam correction updates history and removes only that attempt from error analysis', () => {
  const state = data(); state.history = [{runId:'run',correct:0,total:1,results:[result]}]; state.errors = {1:{author:2,title:0,skipped:0,confusedWith:{}}};
  const corrected = applyCorrection(state, {mode:'exam',runId:'run'}, result);
  assert.equal(corrected.history[0].correct, 1); assert.equal(corrected.history[0].results[0].manual, true);
  assert.equal(corrected.errors[1].author, 1);
  state.errors[1].author=1;
  assert.equal(applyCorrection(state, {mode:'exam',runId:'run'}, result).errors[1], undefined);
});
test('Skipped, already correct and quiz answers cannot be overridden', () => {
  assert.equal(canCorrect({correct:false}),false);
  assert.equal(canCorrect({...result,correct:true}),false);
  const state=data(); assert.equal(applyCorrection(state,{mode:'quiz'},result),state);
});
