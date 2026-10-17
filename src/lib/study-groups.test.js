import test from 'node:test';
import assert from 'node:assert/strict';
import collection from './collection.json' with { type: 'json' };
import { epochs, epochFor, studyWorks, studyTitle, unknownAuthor, validStudyFilters } from './study-groups.js';

test('The user’s 15 epoch ranges cover all 170 works exactly once', () => {
  const ranges = [[1,2],[3,7],[8,11],[12,32],[33,48],[49,57],[58,79],[80,88],[89,90],[91,104],[105,119],[120,142],[143,155],[156,166],[167,170]];
  assert.deepEqual(epochs.map(e => [e.start,e.end]), ranges);
  assert.equal(epochs.length, 15);
  for (const work of collection) {
    assert.equal(epochs.filter(e => work.id >= e.start && work.id <= e.end).length, 1);
    assert.ok(epochFor(work.id));
  }
  assert.equal(epochFor(49).title, 'Искусство XVIII в.');
  assert.equal(epochFor(0), undefined);
  assert.equal(epochFor(171), undefined);
});
test('Epoch study includes both boundaries and keeps complete topics in numeric order', () => {
  for (const epoch of epochs) {
    const works = studyWorks([...collection].reverse(), { epoch: epoch.id });
    assert.equal(works.length, epoch.end - epoch.start + 1);
    assert.equal(works[0].id, epoch.start);
    assert.equal(works.at(-1).id, epoch.end);
  }
  assert.equal(studyWorks(collection).length, 170);
  assert.deepEqual(studyWorks(collection, { epoch: 'invalid' }), []);
});
test('Author and epoch filters can be used independently or together', () => {
  const author = 'И. Репин';
  const all = studyWorks(collection, { author });
  assert.ok(all.length > 1);
  assert.ok(all.every(work => work.author === author));
  const intersection = studyWorks(collection, { author, epoch: '120-142' });
  assert.deepEqual(intersection, all.filter(work => work.id >= 120 && work.id <= 142));
  assert.ok(intersection.length > 0);
  assert.equal(studyWorks(collection, { author, epoch: '1-2' }).length, 0);
  assert.equal(studyWorks(collection, { author: unknownAuthor, epoch: '1-2' }).length, 2);
});
test('Study titles and filter validation support legacy and unknown-author lessons', () => {
  assert.equal(studyTitle({ author: '', epoch: '' }), 'Все работы');
  assert.equal(studyTitle({ author: 'И. Репин', epoch: '120-142' }), 'Русское искусство 2-й половины XIX в. · И. Репин');
  assert.equal(studyTitle({ author: unknownAuthor, epoch: '' }), 'Автор не указан');
  assert.equal(studyTitle(undefined), '');
  assert.equal(validStudyFilters({ author: '', epoch: '167-170' }), true);
  for (const value of [null, [], { author: 10, epoch: '' }, { author: '', epoch: 'bad' }, { author: 'a'.repeat(181), epoch: '' }]) assert.equal(validStudyFilters(value), false);
});
