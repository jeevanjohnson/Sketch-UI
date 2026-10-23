import test from 'node:test';
import assert from 'node:assert/strict';
import { starter, validateProject, History, bounds, resizeObjects, component } from '../model.mjs';

test('downloaded document round-trips all component groups and notes', () => {
  const original = starter();
  const restored = validateProject(JSON.parse(JSON.stringify(original)));
  assert.deepEqual(restored, original);
  assert.ok(restored.pages[0].objects.some(o => o.annotation));
  assert.ok(restored.pages[0].objects.some(o => o.group));
});

test('invalid document fails before replacing editable state', () => {
  const invalid = starter();
  invalid.pages[0].objects[0].x = Infinity;
  assert.throws(() => validateProject(invalid), /geometry/);
  invalid.pages[0].objects[0].x = 0;
  invalid.pages[0].objects[0].fill = 'url(https://example.org/external.svg)';
  assert.throws(() => validateProject(invalid), /colors/);
  assert.throws(() => validateProject({ format: 'unknown' }), /version 1/);
});

test('history restores edits and discards redo after a new branch', () => {
  const initial = starter();
  const history = new History(initial);
  initial.name = 'First change'; history.push(initial);
  initial.name = 'Second change'; history.push(initial);
  const undone = history.undo(); assert.equal(undone.name, 'First change');
  assert.equal(history.redo().name, 'Second change');
  const branch = history.undo(); branch.name = 'Branch'; history.push(branch);
  assert.equal(history.redo(), undefined);
  assert.equal(history.undo().name, 'First change');
});

test('resizing a component scales parts while keeping group identity', () => {
  const objects = component('input', 100, 100);
  const before = bounds(objects); const group = objects[0].group;
  resizeObjects(objects, before, { x: 200, y: 300, w: before.w * 2, h: before.h * 2 });
  assert.deepEqual(bounds(objects), { x: 200, y: 300, w: before.w * 2, h: before.h * 2 });
  assert.ok(objects.every(o => o.group === group));
});

test('bounds includes reverse-direction arrows and degenerate lines', () => {
  const rect = bounds([{ x: 100, y: 60, w: -80, h: -20 }, { x: 10, y: 20, w: 0, h: 90 }]);
  assert.deepEqual(rect, { x: 10, y: 20, w: 90, h: 90 });
});
