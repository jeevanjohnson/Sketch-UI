import { validCrop } from './image-processing.mjs';
export const uid = () => globalThis.crypto.randomUUID();
export const clone = value => structuredClone(value);
export const defaults = { fill: '#faf6ed', stroke: '#252722', strokeWidth: 2, fontSize: 22, sketch: false, annotation: false };

export function shape(type, x, y, w, h, extra = {}) {
  return { id: uid(), type, x, y, w, h, ...defaults, ...extra };
}

export function component(kind, x = 100, y = 100) {
  const group = uid();
  const part = (type, dx, dy, w, h, options = {}) => shape(type, x + dx, y + dy, w, h, { group, ...options });
  const text = (label, dx, dy, w, h = 30, options = {}) => part('text', dx, dy, w, h, { text: label, fill: '#252722', fontSize: 20, ...options });
  switch (kind) {
    case 'button': return [part('rect', 0, 0, 170, 50, { radius: 8, fill: '#253e83' }), text('Button', 20, 10, 130, 30, { fill: '#ffffff', align: 'center' })];
    case 'input': return [text('Field label', 0, 0, 250), part('rect', 0, 36, 260, 48, { radius: 5, fill: '#ffffff' }), text('Placeholder', 14, 47, 230, 28, { fill: '#6b6c69', fontSize: 17 })];
    case 'checkbox': return [part('rect', 0, 5, 24, 24, { radius: 3, fill: '#ffffff' }), text('Checkbox label', 38, 2, 210)];
    case 'dropdown': return [part('rect', 0, 0, 240, 48, { radius: 4, fill: '#ffffff' }), text('Select option', 14, 10, 185), text('⌄', 206, 8, 24)];
    case 'card': return [part('rect', 0, 0, 280, 180, { radius: 14, fill: '#ffffff' }), text('Card title', 22, 24, 235, 35, { fontSize: 26 }), text('A little supporting detail.', 22, 77, 235, 50, { fontSize: 17 })];
    case 'navbar': return [part('rect', 0, 0, 650, 72, { fill: '#ffffff' }), text('BRAND', 22, 23, 180, 30, { fontSize: 22 }), text('Home     About     Contact', 300, 25, 330, 30, { fontSize: 17 })];
    case 'image': return [part('rect', 0, 0, 260, 170, { fill: '#eee4cf' }), part('line', 0, 0, 260, 170), part('line', 0, 170, 260, -170), text('IMAGE', 65, 70, 130, 30, { align: 'center' })];
    case 'device': return [part('rect', 0, 0, 390, 720, { radius: 32, fill: '#ffffff', strokeWidth: 4 }), part('rect', 143, 14, 104, 19, { radius: 10, fill: '#252722' }), part('line', 143, 700, 104, 0, { strokeWidth: 5 })];
    default: return [];
  }
}

export function newPage(name = 'Untitled screen', width = 1200, height = 800) {
  return { id: uid(), name, width, height, background: '#ffffff', objects: [] };
}

export function starter() {
  const page = newPage('01 — Login exploration', 1200, 800);
  page.objects = [
    shape('text', 92, 64, 600, 64, { text: 'A place to begin.', fontSize: 46, fill: '#252722' }),
    shape('text', 94, 138, 600, 40, { text: 'Your next interface starts with a few lines.', fontSize: 20, fill: '#62645d' }),
    shape('rect', 300, 240, 470, 340, { radius: 30, sketch: true, fill: '#faf6ed', strokeWidth: 3 }),
    ...component('input', 350, 285), ...component('input', 350, 400), ...component('button', 450, 620),
    shape('arrow', 824, 357, -80, 0, { annotation: true, stroke: '#d93f25', strokeWidth: 2 }),
    shape('note', 845, 300, 255, 140, { text: 'Make it yours.\nTry moving a field, or\ndraw something new.', fill: '#fff0bb', stroke: '#b88220', annotation: true, fontSize: 20 })
  ];
  const fields = page.objects.filter(o => o.type === 'text' && o.text === 'Field label');
  fields[0].text = 'Email address'; fields[1].text = 'Password';
  page.objects.find(o => o.text === 'Button').text = 'Sign in';
  return { format: 'sketchroom', version: 1, name: 'My first sketch', pages: [page] };
}

export function bounds(objects) {
  if (!objects.length) return null;
  const x = Math.min(...objects.map(o => Math.min(o.x, o.x + o.w)));
  const y = Math.min(...objects.map(o => Math.min(o.y, o.y + o.h)));
  const right = Math.max(...objects.map(o => Math.max(o.x, o.x + o.w)));
  const bottom = Math.max(...objects.map(o => Math.max(o.y, o.y + o.h)));
  return { x, y, w: right - x, h: bottom - y };
}

export function resizeObjects(objects, from, to) {
  const sx = to.w / (from.w || 1), sy = to.h / (from.h || 1);
  for (const object of objects) {
    object.x = to.x + (object.x - from.x) * sx;
    object.y = to.y + (object.y - from.y) * sy;
    object.w *= sx; object.h *= sy;
  }
}

export function validateProject(input) {
  const fail = message => { throw new Error(message); };
  const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100000;
  const color = c => typeof c === 'string' && /^(#[0-9a-f]{6}|none)$/i.test(c);
  if (!input || input.format !== 'sketchroom' || input.version !== 1) fail('Choose a Sketchroom version 1 project file.');
  if (typeof input.name !== 'string' || input.name.length > 300) fail('Invalid project name.');
  if (!Array.isArray(input.pages) || !input.pages.length || input.pages.length > 100) fail('Projects need between 1 and 100 pages.');
  const ids = new Set();
  for (const page of input.pages) {
    if (typeof page.id !== 'string' || ids.has(page.id)) fail('Invalid or duplicate page ID.');
    ids.add(page.id);
    if (typeof page.name !== 'string' || page.name.length > 300 || !finite(page.width) || !finite(page.height) || page.width < 100 || page.height < 100 || page.width > 8000 || page.height > 8000 || !color(page.background)) fail('Invalid page dimensions or appearance.');
    if (!Array.isArray(page.objects) || page.objects.length > 10000) fail('Too many objects on a page.');
    for (const o of page.objects) {
      if (typeof o.id !== 'string' || ids.has(o.id)) fail('Invalid or duplicate object ID.');
      ids.add(o.id);
      if (!['rect', 'ellipse', 'text', 'note', 'line', 'arrow', 'pen', 'image'].includes(o.type)) fail('Unknown object type.');
      if (![o.x, o.y, o.w, o.h, o.strokeWidth, o.fontSize].every(finite) || o.strokeWidth < 0 || o.strokeWidth > 30 || o.fontSize < 8 || o.fontSize > 200 || !color(o.fill) || !color(o.stroke)) fail('Invalid object geometry or colors.');
      if (o.text !== undefined && (typeof o.text !== 'string' || o.text.length > 10000)) fail('Invalid text.');
      if (o.group !== undefined && typeof o.group !== 'string') fail('Invalid group.');
      if (o.radius !== undefined && (!finite(o.radius) || o.radius < 0)) fail('Invalid corner radius.');
      if (o.padding !== undefined && (!finite(o.padding) || o.padding < 0 || o.padding > 500)) fail('Invalid text padding.');
      if (o.textColor !== undefined && !color(o.textColor)) fail('Invalid text color.');
      if (o.align !== undefined && !['left', 'center', 'right'].includes(o.align)) fail('Invalid text alignment.');
      if (o.verticalAlign !== undefined && !['top', 'middle', 'bottom'].includes(o.verticalAlign)) fail('Invalid vertical alignment.');
      if (o.autoHeight !== undefined && typeof o.autoHeight !== 'boolean') fail('Invalid text sizing.');
      if (o.type === 'pen' && (!Array.isArray(o.points) || o.points.length > 50000 || !o.points.every(p => Array.isArray(p) && p.length === 2 && p.every(finite)))) fail('Invalid pen stroke.');
      if (o.type === 'image') {
        const imageSource = value => typeof value === 'string' && value.length < 24000000 && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value);
        if (!imageSource(o.src) || (o.originalSrc !== undefined && !imageSource(o.originalSrc))) fail('Image data must be an embedded PNG.');
        if (![o.pixelWidth, o.pixelHeight].every(n => Number.isInteger(n) && n > 0 && n <= 4096) || o.pixelWidth * o.pixelHeight > 12000000 || o.w <= 0 || o.h <= 0) fail('Invalid image dimensions.');
        if (o.crop !== undefined && !validCrop(o.crop)) fail('Invalid image crop.');
      }
    }
  }
  return clone(input);
}

export class History {
  constructor(initial) {
    this.assets = new Map(); this.assetIds = new Map();
    this.states = [this.serialize(initial)]; this.index = 0;
  }
  serialize(value) {
    return JSON.stringify(value, (key, item) => {
      if ((key === 'src' || key === 'originalSrc') && typeof item === 'string' && item.startsWith('data:image/')) {
        if (!this.assetIds.has(item)) { const id = String(this.assets.size); this.assetIds.set(item, id); this.assets.set(id, item); }
        return { __imageAsset: this.assetIds.get(item) };
      }
      return item;
    });
  }
  restore(state) {
    return JSON.parse(state, (key, value) => (key === 'src' || key === 'originalSrc') && value?.__imageAsset !== undefined ? this.assets.get(value.__imageAsset) : value);
  }
  push(value) {
    const state = this.serialize(value);
    if (state === this.states[this.index]) return false;
    this.states.splice(this.index + 1); this.states.push(state);
    if (this.states.length > 100) this.states.shift();
    this.index = this.states.length - 1;
    return true;
  }
  undo() { if (this.index > 0) return this.restore(this.states[--this.index]); }
  redo() { if (this.index < this.states.length - 1) return this.restore(this.states[++this.index]); }
}
