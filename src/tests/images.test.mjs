import test from 'node:test';
import assert from 'node:assert/strict';
import { removePlainBackground, validCrop } from '../image-processing.mjs';
import { History, newPage, shape, validateProject } from '../model.mjs';

test('color removal preserves foreground and existing transparency', () => {
  const pixels = new Uint8ClampedArray([255, 255, 255, 255, 20, 30, 40, 255, 255, 255, 255, 0]);
  const output = removePlainBackground(pixels, 3, 1, [255, 255, 255], 20);
  assert.equal(output[3], 0); assert.equal(output[7], 255); assert.equal(output[11], 0);
  assert.equal(pixels[3], 255, 'Original pixels remain untouched');
});
test('connected mode keeps enclosed white details; all-colors mode removes them', () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255);
  for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) {
    if (x === 2 && y === 2) continue;
    pixels.set([10, 20, 30, 255], (y * 5 + x) * 4);
  }
  const connected = removePlainBackground(pixels, 5, 5, [255, 255, 255], 20, true);
  const all = removePlainBackground(pixels, 5, 5, [255, 255, 255], 20, false);
  assert.equal(connected[(2 * 5 + 2) * 4 + 3], 255);
  assert.equal(all[(2 * 5 + 2) * 4 + 3], 0);
});
test('crop rejects out-of-image and degenerate selections', () => {
  assert.ok(validCrop({ x: .1, y: .2, w: .5, h: .4 }));
  assert.equal(validCrop({ x: .9, y: 0, w: .2, h: 1 }), false);
  assert.equal(validCrop({ x: 0, y: 0, w: 0, h: 1 }), false);
});
test('image project and history retain embedded assets without duplicate snapshots', () => {
  const page = newPage();
  const source = 'data:image/png;base64,iVBORw0KGgo=';
  page.objects = [shape('image', 10, 20, 100, 100, { src: source, pixelWidth: 100, pixelHeight: 100, crop: { x: 0, y: 0, w: 1, h: 1 } })];
  const project = { format: 'sketchroom', version: 1, name: 'Images', pages: [page] };
  assert.deepEqual(validateProject(project), project);
  const history = new History(project); page.objects[0].x = 50; history.push(project);
  assert.equal(history.assets.size, 1);
  assert.equal(history.undo().pages[0].objects[0].src, source);
  page.objects[0].src = 'https://example.org/image.png';
  assert.throws(() => validateProject(project), /embedded PNG/);
});
