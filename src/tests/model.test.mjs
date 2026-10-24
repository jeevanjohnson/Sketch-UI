import test from 'node:test';
import assert from 'node:assert/strict';
import { starter, validateProject, History, bounds, resizeObjects, component } from '../model.mjs';

test('downloaded document round-trips all component groups and notes', () => {
  const original = starter();
  const restored = validateProject(JSON.parse(JSON.stringify(original)));
  assert.deepEqual(restored, original);
  assert.ok(restored.pages[0].objects.some((o) => o.annotation));
  assert.ok(restored.pages[0].objects.some((o) => o.group));
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
  initial.name = 'First change';
  history.push(initial);
  initial.name = 'Second change';
  history.push(initial);
  const undone = history.undo();
  assert.equal(undone.name, 'First change');
  assert.equal(history.redo().name, 'Second change');
  const branch = history.undo();
  branch.name = 'Branch';
  history.push(branch);
  assert.equal(history.redo(), undefined);
  assert.equal(history.undo().name, 'First change');
});

test('resizing a component scales parts while keeping group identity', () => {
  const objects = component('input', 100, 100);
  const before = bounds(objects);
  const group = objects[0].group;
  resizeObjects(objects, before, { x: 200, y: 300, w: before.w * 2, h: before.h * 2 });
  assert.deepEqual(bounds(objects), { x: 200, y: 300, w: before.w * 2, h: before.h * 2 });
  assert.ok(objects.every((o) => o.group === group));
});

test('bounds includes reverse-direction arrows and degenerate lines', () => {
  const rect = bounds([
    { x: 100, y: 60, w: -80, h: -20 },
    { x: 10, y: 20, w: 0, h: 90 }
  ]);
  assert.deepEqual(rect, { x: 10, y: 20, w: 90, h: 90 });
});

test('malformed renderer metadata is rejected before it reaches the inspector', () => {
  for (const name of [42, {}, [], 'x'.repeat(301)]) {
    const project = starter();
    project.pages[0].objects[0].name = name;
    assert.throws(() => validateProject(project), /object name/);
  }
  for (const flag of ['sketch', 'annotation']) {
    const project = starter();
    project.pages[0].objects[0][flag] = 'false';
    assert.throws(() => validateProject(project), /flag/);
  }
  const project = starter();
  project.pages[0] = null;
  assert.throws(() => validateProject(project), /Invalid page/);
  project.pages = starter().pages;
  project.pages[0].objects = [null];
  assert.throws(() => validateProject(project), /Invalid object/);
});

test('history releases abandoned image branches without reusing live asset IDs', () => {
  const initial = { src: 'data:image/png;base64,AAAA', name: 'initial' };
  const history = new History(initial);
  history.push({ src: 'data:image/png;base64,BBBB', name: 'abandoned' });
  const branch = history.undo();
  branch.name = 'branch';
  history.push(branch);
  assert.equal(history.assetIds.has('data:image/png;base64,BBBB'), false);
  assert.equal(history.assets.size, 1);
  history.push({ src: 'data:image/png;base64,CCCC', originalSrc: initial.src });
  assert.equal(history.undo().src, initial.src);
  assert.equal(history.redo().src, 'data:image/png;base64,CCCC');
  assert.equal(history.restore(history.states.at(-1)).originalSrc, initial.src);
});

test('history releases expired images while preserving all retained undo states', () => {
  const history = new History({ src: 'data:image/png;base64,AAAA', revision: 0 });
  for (let revision = 1; revision <= 101; revision++) {
    history.push({ src: 'data:image/png;base64,BBBB', revision });
  }
  assert.equal(history.states.length, 100);
  assert.equal(history.assets.size, 1);
  assert.equal(history.assetIds.has('data:image/png;base64,AAAA'), false);
  let restored;
  for (let index = 0; index < 99; index++) restored = history.undo();
  assert.deepEqual(restored, { src: 'data:image/png;base64,BBBB', revision: 2 });
  assert.equal(history.undo(), undefined);
});

// These expectations come from the version-1 format limits, not current output.
test('optional object metadata enforces format limits after validation refactoring', () => {
  for (const [key, value, message] of [
    ['group', 42, /group/],
    ['radius', -1, /radius/],
    ['padding', 501, /padding/],
    ['text', 'x'.repeat(10001), /text/],
    ['textColor', 'red', /color/],
    ['align', 'justify', /alignment/],
    ['verticalAlign', 'baseline', /alignment/],
    ['autoHeight', 'false', /sizing/]
  ]) {
    const project = starter();
    project.pages[0].objects[0][key] = value;
    assert.throws(() => validateProject(project), message, key);
  }
});
