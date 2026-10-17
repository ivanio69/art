import test from 'node:test';
import assert from 'node:assert/strict';
import { pageFromHash, pageHash } from './navigation.js';
test('Main sections have stable links and unknown routes fall back to home', () => {
  for (const page of ['home', 'gallery', 'history', 'errors']) assert.equal(pageFromHash(pageHash(page)), page);
  assert.equal(pageFromHash(''), 'home');
  assert.equal(pageFromHash('#gallery'), 'gallery');
  assert.equal(pageFromHash('#/unknown'), 'home');
  assert.equal(pageHash('invalid'), '#/home');
});
