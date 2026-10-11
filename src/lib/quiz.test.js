import test from 'node:test';
import assert from 'node:assert/strict';
import { makeOptions } from './quiz.js';
test('Quiz offers four distinct answers with exactly one correct painting', () => {
  const painting = { id: 1, title: 'Давид', author: 'Микеланджело' };
  const pool = [painting, { ...painting, id: 2 }, { id: 3, title: 'Давид', author: 'Донателло' }, { id: 4, title: 'Весна', author: 'Боттичелли' }, { id: 5, title: 'Даная', author: 'Рембрандт' }];
  const options = makeOptions(painting, pool, () => .5);
  assert.equal(options.length, 4);
  assert.equal(options.filter(p => p.id === painting.id).length, 1);
  assert.equal(new Set(options.map(p => p.title + p.author)).size, 4);
});
test('Previously confused paintings are included among distractors', () => {
  const paintings = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, title: `Work ${i}`, author: 'Author' }));
  const options = makeOptions(paintings[0], paintings, () => 0.5, [10]);
  assert.equal(options.some(p => p.id === 10), true);
  assert.equal(options.length, 4);
});
