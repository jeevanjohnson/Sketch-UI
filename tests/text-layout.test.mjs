import test from 'node:test';
import assert from 'node:assert/strict';
import { wrapText, textLayout } from '../text-layout.mjs';
import { starter, validateProject } from '../model.mjs';

const measure = value => value.length * 10;
test('wraps words, explicit newlines, and words wider than the box', () => {
  assert.deepEqual(wrapText('one two three', 70, measure), ['one two', 'three']);
  assert.deepEqual(wrapText('first\n\nlast', 100, measure), ['first', '', 'last']);
  assert.deepEqual(wrapText('abcdefgh', 30, measure), ['abc', 'def', 'gh']);
});
test('shape text centers inside padding and reports height overflow', () => {
  const o = { type: 'rect', x: 100, y: 50, w: 200, h: 120, fontSize: 20, text: 'hello', padding: 10 };
  const layout = textLayout(o, measure);
  assert.equal(layout.x, 200);
  assert.equal(layout.top, 97);
  assert.equal(layout.width, 180);
  assert.equal(layout.overflow, false);
  o.text = 'a\nb\nc\nd\ne';
  assert.equal(textLayout(o, measure).overflow, true);
});
test('old project files remain valid and new text properties round-trip', () => {
  const p = starter();
  validateProject(p);
  Object.assign(p.pages[0].objects[0], { padding: 12, align: 'right', verticalAlign: 'bottom', autoHeight: true, textColor: '#253e83' });
  assert.deepEqual(validateProject(p), p);
  p.pages[0].objects[0].padding = -1;
  assert.throws(() => validateProject(p), /padding/);
});
