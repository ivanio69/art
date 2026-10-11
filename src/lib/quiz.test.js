import test from 'node:test';
import assert from 'node:assert/strict';
import { makeOptions, quizIdentity, quizEligible } from './quiz.js';
import collection from './collection.json' with { type: 'json' };
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
test('Author and title quizzes deduplicate the visible field, not the whole work', () => {
  const pool = [
    { id: 1, title: 'Первая', author: 'Автор А' },
    { id: 2, title: 'Вторая', author: 'Автор А' },
    { id: 3, title: 'Первая', author: 'Автор Б' },
    { id: 4, title: 'Третья', author: 'Автор В' },
    { id: 5, title: 'Четвёртая', author: 'Автор Г' },
    { id: 6, title: 'Пятая', author: '', authorRequired: false },
  ];
  for (const field of ['author', 'title']) {
    const options = makeOptions(pool[0], pool, () => .5, [2, 3, 6], field);
    assert.equal(options.length, 4);
    assert.equal(new Set(options.map(p => quizIdentity(p, field))).size, 4);
    assert.equal(options.some(p => p.id === 1), true);
    if (field === 'author') assert.equal(options.some(p => !p.author), false);
  }
});
test('Every eligible collection work has four unique options in each quiz mode', () => {
  for (const field of ['both', 'author', 'title']) for (const painting of collection.filter(p => quizEligible(p, field))) {
    const options = makeOptions(painting, collection, () => .5, [], field);
    assert.equal(options.length, 4, `${field}: ${painting.id}`);
    assert.equal(new Set(options.map(p => quizIdentity(p, field))).size, 4);
    assert.equal(options.filter(p => p.id === painting.id).length, 1);
  }
});
