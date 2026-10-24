// Owns editable document construction, geometry, import validation, and undo.
// Callers provide plain project data; no DOM or desktop APIs are used here.
import { validCrop } from './image-processing.mjs';
export const uid = () => globalThis.crypto.randomUUID();
export const clone = (value) => structuredClone(value);
export const defaults = {
  fill: '#faf6ed',
  stroke: '#252722',
  strokeWidth: 2,
  fontSize: 22,
  sketch: false,
  annotation: false
};

export function shape(type, x, y, w, h, extra = {}) {
  return { id: uid(), type, x, y, w, h, ...defaults, ...extra };
}

export function component(kind, x = 100, y = 100) {
  const group = uid();
  const part = (type, dx, dy, w, h, options = {}) =>
    shape(type, x + dx, y + dy, w, h, { group, ...options });
  const text = (label, dx, dy, w, h = 30, options = {}) =>
    part('text', dx, dy, w, h, { text: label, fill: '#252722', fontSize: 20, ...options });
  switch (kind) {
    case 'button':
      return [
        part('rect', 0, 0, 170, 50, { radius: 8, fill: '#253e83' }),
        text('Button', 20, 10, 130, 30, { fill: '#ffffff', align: 'center' })
      ];
    case 'input':
      return [
        text('Field label', 0, 0, 250),
        part('rect', 0, 36, 260, 48, { radius: 5, fill: '#ffffff' }),
        text('Placeholder', 14, 47, 230, 28, { fill: '#6b6c69', fontSize: 17 })
      ];
    case 'checkbox':
      return [
        part('rect', 0, 5, 24, 24, { radius: 3, fill: '#ffffff' }),
        text('Checkbox label', 38, 2, 210)
      ];
    case 'dropdown':
      return [
        part('rect', 0, 0, 240, 48, { radius: 4, fill: '#ffffff' }),
        text('Select option', 14, 10, 185),
        text('⌄', 206, 8, 24)
      ];
    case 'card':
      return [
        part('rect', 0, 0, 280, 180, { radius: 14, fill: '#ffffff' }),
        text('Card title', 22, 24, 235, 35, { fontSize: 26 }),
        text('A little supporting detail.', 22, 77, 235, 50, { fontSize: 17 })
      ];
    case 'navbar':
      return [
        part('rect', 0, 0, 650, 72, { fill: '#ffffff' }),
        text('BRAND', 22, 23, 180, 30, { fontSize: 22 }),
        text('Home     About     Contact', 300, 25, 330, 30, { fontSize: 17 })
      ];
    case 'image':
      return [
        part('rect', 0, 0, 260, 170, { fill: '#eee4cf' }),
        part('line', 0, 0, 260, 170),
        part('line', 0, 170, 260, -170),
        text('IMAGE', 65, 70, 130, 30, { align: 'center' })
      ];
    case 'device':
      return [
        part('rect', 0, 0, 390, 720, { radius: 32, fill: '#ffffff', strokeWidth: 4 }),
        part('rect', 143, 14, 104, 19, { radius: 10, fill: '#252722' }),
        part('line', 143, 700, 104, 0, { strokeWidth: 5 })
      ];
    default:
      return [];
  }
}

export function newPage(name = 'Untitled screen', width = 1200, height = 800) {
  return { id: uid(), name, width, height, background: '#ffffff', objects: [] };
}

export function starter() {
  const page = newPage('01 — Login exploration', 1200, 800);
  page.objects = [
    shape('text', 92, 64, 600, 64, { text: 'A place to begin.', fontSize: 46, fill: '#252722' }),
    shape('text', 94, 138, 600, 40, {
      text: 'Your next interface starts with a few lines.',
      fontSize: 20,
      fill: '#62645d'
    }),
    shape('rect', 300, 240, 470, 340, {
      radius: 30,
      sketch: true,
      fill: '#faf6ed',
      strokeWidth: 3
    }),
    ...component('input', 350, 285),
    ...component('input', 350, 400),
    ...component('button', 450, 620),
    shape('arrow', 824, 357, -80, 0, { annotation: true, stroke: '#d93f25', strokeWidth: 2 }),
    shape('note', 845, 300, 255, 140, {
      text: 'Make it yours.\nTry moving a field, or\ndraw something new.',
      fill: '#fff0bb',
      stroke: '#b88220',
      annotation: true,
      fontSize: 20
    })
  ];
  const fields = page.objects.filter((o) => o.type === 'text' && o.text === 'Field label');
  fields[0].text = 'Email address';
  fields[1].text = 'Password';
  page.objects.find((o) => o.text === 'Button').text = 'Sign in';
  return { format: 'sketchroom', version: 1, name: 'My first sketch', pages: [page] };
}

export function bounds(objects) {
  if (!objects.length) return null;
  const x = Math.min(...objects.map((o) => Math.min(o.x, o.x + o.w)));
  const y = Math.min(...objects.map((o) => Math.min(o.y, o.y + o.h)));
  const right = Math.max(...objects.map((o) => Math.max(o.x, o.x + o.w)));
  const bottom = Math.max(...objects.map((o) => Math.max(o.y, o.y + o.h)));
  return { x, y, w: right - x, h: bottom - y };
}

export function resizeObjects(objects, from, to) {
  const scaleX = to.w / (from.w || 1);
  const scaleY = to.h / (from.h || 1);
  for (const object of objects) {
    object.x = to.x + (object.x - from.x) * scaleX;
    object.y = to.y + (object.y - from.y) * scaleY;
    object.w *= scaleX;
    object.h *= scaleY;
  }
}

export function validateProject(input) {
  const fail = (message) => {
    throw new Error(message);
  };
  const finite = (n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 100000;
  const color = (c) => typeof c === 'string' && /^(#[0-9a-f]{6}|none)$/i.test(c);
  if (!input || input.format !== 'sketchroom' || input.version !== 1) {
    fail('Choose a SketchUI version 1 project file.');
  }
  if (typeof input.name !== 'string' || input.name.length > 300) {
    fail('Invalid project name.');
  }
  if (!Array.isArray(input.pages) || !input.pages.length || input.pages.length > 100) {
    fail('Projects need between 1 and 100 pages.');
  }
  const ids = new Set();
  for (const page of input.pages) {
    if (!page || typeof page !== 'object') {
      fail('Invalid page.');
    }
    if (typeof page.id !== 'string' || ids.has(page.id)) {
      fail('Invalid or duplicate page ID.');
    }
    ids.add(page.id);
    const validPageSize = [page.width, page.height].every((value) => {
      return finite(value) && value >= 100 && value <= 8000;
    });
    if (
      typeof page.name !== 'string' ||
      page.name.length > 300 ||
      !validPageSize ||
      !color(page.background)
    ) {
      fail('Invalid page dimensions or appearance.');
    }
    if (!Array.isArray(page.objects) || page.objects.length > 10000) {
      fail('Too many objects on a page.');
    }
    for (const object of page.objects) {
      if (!object || typeof object !== 'object') {
        fail('Invalid object.');
      }
      if (typeof object.id !== 'string' || ids.has(object.id)) {
        fail('Invalid or duplicate object ID.');
      }
      ids.add(object.id);
      if (
        !['rect', 'ellipse', 'text', 'note', 'line', 'arrow', 'pen', 'image'].includes(object.type)
      ) {
        fail('Unknown object type.');
      }
      const geometry = [object.x, object.y, object.w, object.h];
      const validStroke =
        finite(object.strokeWidth) && object.strokeWidth >= 0 && object.strokeWidth <= 30;
      const validFont = finite(object.fontSize) && object.fontSize >= 8 && object.fontSize <= 200;
      if (
        !geometry.every(finite) ||
        !validStroke ||
        !validFont ||
        !color(object.fill) ||
        !color(object.stroke)
      ) {
        fail('Invalid object geometry or colors.');
      }
      if (
        object.text !== undefined &&
        (typeof object.text !== 'string' || object.text.length > 10000)
      ) {
        fail('Invalid text.');
      }
      if (
        object.name !== undefined &&
        (typeof object.name !== 'string' || object.name.length > 300)
      ) {
        fail('Invalid object name.');
      }
      for (const flag of ['sketch', 'annotation']) {
        if (object[flag] !== undefined && typeof object[flag] !== 'boolean') {
          fail(`Invalid ${flag} flag.`);
        }
      }
      if (object.group !== undefined && typeof object.group !== 'string') {
        fail('Invalid group.');
      }
      if (object.radius !== undefined && (!finite(object.radius) || object.radius < 0)) {
        fail('Invalid corner radius.');
      }
      if (
        object.padding !== undefined &&
        (!finite(object.padding) || object.padding < 0 || object.padding > 500)
      ) {
        fail('Invalid text padding.');
      }
      if (object.textColor !== undefined && !color(object.textColor)) {
        fail('Invalid text color.');
      }
      if (object.align !== undefined && !['left', 'center', 'right'].includes(object.align)) {
        fail('Invalid text alignment.');
      }
      if (
        object.verticalAlign !== undefined &&
        !['top', 'middle', 'bottom'].includes(object.verticalAlign)
      ) {
        fail('Invalid vertical alignment.');
      }
      if (object.autoHeight !== undefined && typeof object.autoHeight !== 'boolean') {
        fail('Invalid text sizing.');
      }
      if (object.type === 'pen') {
        const validPoint = (point) =>
          Array.isArray(point) && point.length === 2 && point.every(finite);
        if (
          !Array.isArray(object.points) ||
          object.points.length > 50000 ||
          !object.points.every(validPoint)
        ) {
          fail('Invalid pen stroke.');
        }
      }
      if (object.type === 'image') {
        const imageSource = (value) =>
          typeof value === 'string' &&
          value.length < 24000000 &&
          /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value);
        if (
          !imageSource(object.src) ||
          (object.originalSrc !== undefined && !imageSource(object.originalSrc))
        ) {
          fail('Image data must be an embedded PNG.');
        }
        const validPixels = [object.pixelWidth, object.pixelHeight].every((value) => {
          return Number.isInteger(value) && value > 0 && value <= 4096;
        });
        if (
          !validPixels ||
          object.pixelWidth * object.pixelHeight > 12000000 ||
          object.w <= 0 ||
          object.h <= 0
        ) {
          fail('Invalid image dimensions.');
        }
        if (object.crop !== undefined && !validCrop(object.crop)) {
          fail('Invalid image crop.');
        }
      }
    }
  }
  return clone(input);
}

export class History {
  constructor(initial) {
    this.assets = new Map();
    this.assetIds = new Map();
    this.nextAssetId = 0;
    this.states = [this.serialize(initial)];
    this.index = 0;
  }

  serialize(value) {
    return JSON.stringify(value, (key, item) => {
      if (
        (key === 'src' || key === 'originalSrc') &&
        typeof item === 'string' &&
        item.startsWith('data:image/')
      ) {
        if (!this.assetIds.has(item)) {
          const id = String(this.nextAssetId++);
          this.assetIds.set(item, id);
          this.assets.set(id, item);
        }
        return { __imageAsset: this.assetIds.get(item) };
      }
      return item;
    });
  }

  restore(state) {
    return JSON.parse(state, (key, value) => {
      if ((key === 'src' || key === 'originalSrc') && value?.__imageAsset !== undefined) {
        return this.assets.get(value.__imageAsset);
      }
      return value;
    });
  }

  releaseUnusedAssets() {
    // Only snapshots in the bounded undo/redo timeline own image references.
    // Discarded redo branches and expired snapshots must release large PNGs.
    const retained = new Set();
    for (const state of this.states) {
      JSON.parse(state, (key, value) => {
        if ((key === 'src' || key === 'originalSrc') && value?.__imageAsset !== undefined) {
          retained.add(value.__imageAsset);
        }
        return value;
      });
    }
    for (const [id, source] of this.assets) {
      if (!retained.has(id)) {
        this.assets.delete(id);
        this.assetIds.delete(source);
      }
    }
  }

  push(value) {
    const state = this.serialize(value);
    if (state === this.states[this.index]) return false;
    const discardedRedo = this.index < this.states.length - 1;
    const expiredSnapshot = this.states.length >= 100;
    this.states.splice(this.index + 1);
    this.states.push(state);
    if (this.states.length > 100) this.states.shift();
    this.index = this.states.length - 1;
    if (discardedRedo || expiredSnapshot) this.releaseUnusedAssets();
    return true;
  }

  undo() {
    if (this.index > 0) return this.restore(this.states[--this.index]);
  }

  redo() {
    if (this.index < this.states.length - 1) return this.restore(this.states[++this.index]);
  }
}
