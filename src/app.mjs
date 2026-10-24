// Coordinates editor actions, document/history state, and desktop file operations.
// Artwork generation is shared by the live stage and PNG export in object-renderer.mjs;
// image-editor.mjs owns image dialogs and workers, while model.mjs owns document rules.
import {
  uid,
  clone,
  shape,
  component,
  newPage,
  starter,
  bounds,
  resizeObjects,
  validateProject,
  History
} from './model.mjs';
import { textLayout } from './text-layout.mjs';
import { createObjectRenderer, element, svgNS } from './object-renderer.mjs';
import { createImageTools } from './image-editor.mjs';

const $ = (selector) => document.querySelector(selector);

let project = starter();
let history = new History(project);
let savedState = '';
let activePage = project.pages[0].id;
let selected = new Set();

let tool = 'select';
let zoom = 1;
let offset = { x: 0, y: 0 };
let interaction = null;
let spaceHeld = false;
let toastTimer;

let pendingSave = null;
let editing = null;
let copiedObjects = null;
let pasteCount = 0;
let lastCanvasClick = null;

const textMeasure = document.createElement('canvas').getContext('2d');
let draftStyle = { fill: '#faf6ed', stroke: '#252722', strokeWidth: 2, fontSize: 22, sketch: true };
const canvas = $('#canvas');
const stage = $('#stage');

const page = () => project.pages.find((p) => p.id === activePage) || project.pages[0];
const chosen = () => page().objects.filter((o) => selected.has(o.id));
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const dirty = () => JSON.stringify(project) !== savedState;

const renderObject = createObjectRenderer(layoutFor, () => editing?.id);
const imageTools = createImageTools({
  desktop: window.desktop,
  getPage: page,
  isPagePresent: (owner) => project.pages.includes(owner),
  select: (id) => {
    selected = new Set([id]);
  },
  mutate,
  notify,
  setTool
});

function notify(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200);
}

function layoutFor(object) {
  textMeasure.font = `${object.fontSize}px "Segoe UI", Arial, sans-serif`;
  return textLayout(object, (value) => textMeasure.measureText(value).width);
}

function growText(object) {
  if (object.type === 'text' && object.autoHeight !== false) {
    const layout = layoutFor(object);
    object.h = Math.max(object.fontSize * 1.3, layout.height + (object.padding || 0) * 2);
  }
}

function artwork(includeAnnotations = true, exporting = false) {
  const group = element('g');
  for (const object of page().objects) {
    if (!includeAnnotations && object.annotation) continue;
    group.append(renderObject(object, exporting));
  }
  return group;
}

function draw() {
  canvas.replaceChildren();
  const transform = element('g', {
    transform: `translate(${offset.x} ${offset.y}) scale(${zoom})`
  });
  transform.append(
    element('rect', {
      x: 7 / zoom,
      y: 9 / zoom,
      width: page().width,
      height: page().height,
      fill: '#12285d',
      opacity: 0.7
    })
  );
  transform.append(
    element('rect', {
      x: 0,
      y: 0,
      width: page().width,
      height: page().height,
      fill: page().background,
      stroke: '#252722',
      'stroke-width': 1 / zoom
    })
  );
  const defs = element('defs');
  const clip = element('clipPath', { id: 'page-clip' });
  clip.append(element('rect', { width: page().width, height: page().height }));
  defs.append(clip);
  transform.append(defs);
  const art = artwork();
  art.setAttribute('clip-path', 'url(#page-clip)');
  transform.append(art);
  const box = bounds(chosen());
  if (box) {
    transform.append(
      element('rect', {
        x: box.x - 3 / zoom,
        y: box.y - 3 / zoom,
        width: Math.max(1, box.w) + 6 / zoom,
        height: Math.max(1, box.h) + 6 / zoom,
        fill: 'none',
        stroke: '#4a72dc',
        'stroke-width': 1.5 / zoom,
        'pointer-events': 'none'
      })
    );
    for (const [handle, dx, dy] of [
      ['nw', 0, 0],
      ['ne', box.w, 0],
      ['sw', 0, box.h],
      ['se', box.w, box.h]
    ]) {
      transform.append(
        element('rect', {
          x: box.x + dx - 4 / zoom,
          y: box.y + dy - 4 / zoom,
          width: 8 / zoom,
          height: 8 / zoom,
          fill: '#ffffff',
          stroke: '#4a72dc',
          'stroke-width': 1.4 / zoom,
          'data-handle': handle,
          style: `cursor:${handle}-resize`
        })
      );
    }
  }
  if (interaction?.kind === 'marquee') {
    const r = normalized(interaction.start, interaction.current);
    transform.append(
      element('rect', {
        ...rectAttrs(r),
        fill: '#4a72dc22',
        stroke: '#4a72dc',
        'stroke-width': 1 / zoom
      })
    );
  }
  if (interaction?.guideX !== undefined)
    transform.append(
      element('line', {
        x1: interaction.guideX,
        x2: interaction.guideX,
        y1: -10000,
        y2: 10000,
        stroke: '#d93f25',
        'stroke-width': 1 / zoom
      })
    );
  if (interaction?.guideY !== undefined)
    transform.append(
      element('line', {
        y1: interaction.guideY,
        y2: interaction.guideY,
        x1: -10000,
        x2: 10000,
        stroke: '#d93f25',
        'stroke-width': 1 / zoom
      })
    );
  canvas.append(transform);
  $('#zoom-value').textContent = `${Math.round(zoom * 100)}%`;
  positionEditor();
}

function positionEditor() {
  if (!editing) return;
  const o = page().objects.find((o) => o.id === editing.id);
  if (!o) return;
  const layout = layoutFor(o);
  const editor = editing.node;
  Object.assign(editor.style, {
    left: `${offset.x + (o.x + layout.padding) * zoom}px`,
    top: `${offset.y + layout.top * zoom}px`,
    width: `${layout.width}px`,
    height: `${Math.max(layout.lineHeight, Math.min(o.h - layout.padding * 2, layout.height + 3))}px`,
    fontSize: `${o.fontSize}px`,
    lineHeight: `${layout.lineHeight}px`,
    textAlign: layout.align,
    color: o.type === 'text' ? o.fill : o.textColor || '#252722',
    transform: `scale(${zoom})`
  });
}

function endEditing(cancel = false) {
  if (!editing) return;
  const state = editing;
  editing = null;
  const o = page().objects.find((o) => o.id === state.id);
  if (o && cancel) Object.assign(o, state.original);
  state.node.remove();
  if (cancel) render();
  else commit();
}

function beginEditing(object) {
  endEditing();
  selected = new Set([object.id]);
  const editor = document.createElement('textarea');
  editor.id = 'inline-text-editor';
  editor.className = 'inline-text-editor';
  editor.setAttribute('aria-label', 'Edit text on canvas');
  editor.maxLength = 10000;
  editor.value = object.text || '';
  editor.spellcheck = false;
  editing = { id: object.id, original: clone(object), node: editor };
  stage.append(editor);
  render();
  positionEditor();
  editor.addEventListener('pointerdown', (event) => event.stopPropagation());
  editor.addEventListener('dblclick', (event) => event.stopPropagation());
  editor.addEventListener('input', () => {
    object.text = editor.value;
    growText(object);
    draw();
    window.desktop?.setDirty(true);
  });
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      endEditing(true);
      stage.focus();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      endEditing();
      stage.focus();
    }
  });
  editor.addEventListener('blur', () => endEditing());
  editor.focus();
  editor.select();
}

function rectAttrs(rect) {
  return { x: rect.x, y: rect.y, width: rect.w, height: rect.h };
}
function normalized(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y)
  };
}
function pointer(event) {
  const rect = stage.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left - offset.x) / zoom,
    y: (event.clientY - rect.top - offset.y) / zoom
  };
}
function snapped(value) {
  return $('#snap').checked ? Math.round(value / 10) * 10 : value;
}
function fit() {
  zoom = Math.min(
    (stage.clientWidth - 100) / page().width,
    (stage.clientHeight - 140) / page().height,
    1.2
  );
  zoom = Math.max(0.05, zoom);
  offset = {
    x: (stage.clientWidth - page().width * zoom) / 2,
    y: 85 + (stage.clientHeight - 110 - page().height * zoom) / 2
  };
  draw();
}
function zoomAt(factor, x = stage.clientWidth / 2, y = stage.clientHeight / 2) {
  const next = Math.min(4, Math.max(0.05, zoom * factor));
  offset = { x: x - ((x - offset.x) * next) / zoom, y: y - ((y - offset.y) * next) / zoom };
  zoom = next;
  draw();
}

function render() {
  if (!project.pages.some((p) => p.id === activePage)) {
    activePage = project.pages[0].id;
    selected.clear();
  }
  selected = new Set([...selected].filter((id) => page().objects.some((o) => o.id === id)));
  $('#project-name').value = project.name;
  $('#save-state').textContent = dirty()
    ? '● Unsaved changes · save to keep'
    : '✓ Project file saved';
  $('#undo').disabled = history.index === 0;
  $('#redo').disabled = history.index === history.states.length - 1;
  window.desktop?.setDirty(dirty());
  $('#page-caption').textContent = `${page().name}  /  ${page().width} × ${page().height}`;
  $('#object-count').textContent =
    `${page().objects.length} objects · ${project.pages.length} ${project.pages.length === 1 ? 'page' : 'pages'}`;
  $('#page-list').innerHTML = project.pages
    .map(
      (p, i) =>
        /* HTML */ `<button
          class="page-item ${p.id === activePage ? 'active' : ''}"
          data-page="${escape(p.id)}"
        >
          <span class="page-icon">${String(i + 1).padStart(2, '0')}</span
          ><span>${escape(p.name)}</span>
        </button>`
    )
    .join('');
  $('#layer-count').textContent = page().objects.length;
  $('#layers').innerHTML = [...page().objects]
    .reverse()
    .map(
      (o) =>
        /* HTML */ `<button
          class="layer ${selected.has(o.id) ? 'active' : ''}"
          data-layer="${escape(o.id)}"
        >
          <span>${escape((o.text || o.name || o.type).slice(0, 28))}</span
          ><small>${o.group ? 'GROUP' : ''}${o.annotation ? ' NOTE' : ''}</small>
        </button>`
    )
    .join('');
  renderInspector();
  draw();
}

function commit() {
  history.push(project);
  render();
}
function mutate(operation) {
  operation();
  commit();
}
function selectObject(id, additive = false, individual = false) {
  const object = page().objects.find((o) => o.id === id);
  if (!object) return;
  const ids =
    object.group && !individual
      ? page()
          .objects.filter((o) => o.group === object.group)
          .map((o) => o.id)
      : [id];
  if (!additive) selected.clear();
  const remove = additive && ids.every((key) => selected.has(key));
  for (const key of ids) remove ? selected.delete(key) : selected.add(key);
}

function renderInspector() {
  const objects = chosen();
  const box = bounds(objects);
  const o = objects[0];
  const field = (label, key, value, min = -100000, max = 100000) =>
    /* HTML */ `<label
      >${label}<input
        type="number"
        data-prop="${key}"
        value="${Math.round(value * 10) / 10}"
        min="${min}"
        max="${max}"
        step="1"
    /></label>`;
  if (!o) {
    $('#inspector-content').innerHTML = /* HTML */ `<h2>Canvas settings</h2>
      <label
        >Page name<input data-page-prop="name" value="${escape(page().name)}" maxlength="300"
      /></label>
      <div class="field-pair">
        ${field('Width', 'pageWidth', page().width, 100, 8000)}${field(
          'Height',
          'pageHeight',
          page().height,
          100,
          8000
        )}
      </div>
      <label
        >Paper color<input type="color" data-page-prop="background" value="${page().background}"
      /></label>
      <div class="button-row">
        <button data-action="duplicate-page">Duplicate page</button
        ><button data-action="delete-page" ${project.pages.length === 1 ? 'disabled' : ''}>
          Delete
        </button>
      </div>
      <h3>Drawing defaults</h3>
      ${styleFields(draftStyle)}
      <p class="muted">Select an object to fine-tune it.<br />Double-click text to edit it.</p>`;
    return;
  }
  const textObjects = objects.filter((o) => ['text', 'note', 'rect', 'ellipse'].includes(o.type));
  const group = o.group && objects.every((part) => part.group === o.group);
  const parts = group ? page().objects.filter((part) => part.group === o.group) : [];
  let heading = o.type[0].toUpperCase() + o.type.slice(1);
  if (objects.length > 1) heading = `${objects.length} objects selected`;
  else if (o.type === 'note') heading = 'Annotation';

  $('#inspector-content').innerHTML = /* HTML */ ` <h2>${escape(heading)}</h2>
    <div class="field-pair">
      ${field('X', 'x', box.x)}${field('Y', 'y', box.y)}${field('Width', 'w', box.w, 1)}${field(
        'Height',
        'h',
        box.h,
        1
      )}
    </div>
    ${objects.length === 1 && textObjects.length
      ? /* HTML */ `<label
            >Text<textarea id="object-text" maxlength="10000">
${escape(o.text || '')}</textarea
            ></label
          ><button data-edit-text="${escape(o.id)}">Edit on canvas ↗</button>`
      : ''}
    ${objects.length > 1
      ? objects
          .filter((part) => part.type === 'text' || part.type === 'note')
          .map(
            (part) =>
              /* HTML */ `<label
                >Component text<textarea data-text-id="${escape(part.id)}" maxlength="10000">
${escape(part.text)}</textarea
                >
              </label>`
          )
          .join('')
      : ''}
    ${parts.length
      ? /* HTML */ `<h3>Edit a group part</h3>
          <p class="muted">Keep the group. Pick a part below, or Alt-click it on canvas.</p>
          <div class="part-list">
            ${parts
              .map(
                (part) =>
                  /* HTML */ `<button data-part="${escape(part.id)}">
                    ${escape((part.text || part.type).slice(0, 35))}
                  </button>`
              )
              .join('')}
          </div>`
      : ''}
    ${o.type === 'image' && objects.length === 1
      ? /* HTML */ `<h3>Image</h3>
          <p class="muted">${o.pixelWidth} × ${o.pixelHeight} pixels · embedded in this project</p>
          <div class="part-list">
            <button data-action="edit-image">Crop / remove background ↗</button
            ><button data-action="copy-image">Copy image to clipboard</button>
          </div>`
      : styleFields(o)}
    ${textObjects.length
      ? `${field('Text size', 'fontSize', o.fontSize, 8, 200)}${textFields(textObjects[0], field)}`
      : ''}
    ${objects.some((o) => o.type === 'rect')
      ? field('Corner radius', 'radius', o.radius || 0, 0, 200)
      : ''}
    <label class="check-row"
      ><input
        type="checkbox"
        data-prop="annotation"
        ${objects.every((o) => o.annotation) ? 'checked' : ''}
      />
      Annotation · optional in export</label
    >
    <h3>Arrange</h3>
    <div class="button-row">
      <button data-action="back">To back</button><button data-action="front">To front</button>
    </div>
    <div class="button-row">
      <button data-action="group" ${objects.length < 2 ? 'disabled' : ''}>Group</button
      ><button data-action="ungroup">Ungroup</button>
    </div>
    <div class="button-row">
      <button data-action="left">Left</button><button data-action="center">Center</button
      ><button data-action="right">Right</button>
    </div>
    <div class="button-row">
      <button data-action="top">Top</button><button data-action="middle">Middle</button
      ><button data-action="bottom">Bottom</button>
    </div>
    <div class="button-row">
      <button data-action="copy">Copy</button
      ><button data-action="paste" ${!copiedObjects ? 'disabled' : ''}>Paste</button>
    </div>
    <div class="button-row">
      <button data-action="duplicate">Duplicate</button><button data-action="delete">Delete</button>
    </div>`;
}

function textFields(o, field) {
  const shaped = ['rect', 'ellipse'].includes(o.type);
  const alignment = o.align || (shaped ? 'center' : 'left');
  const vertical = o.verticalAlign || (shaped ? 'middle' : 'top');
  const options = (values, current) =>
    values
      .map(
        (value) =>
          /* HTML */ `<option value="${value}" ${value === current ? 'selected' : ''}>
            ${value[0].toUpperCase() + value.slice(1)}
          </option>`
      )
      .join('');
  return /* HTML */ `<h3>Text layout</h3>
    <div class="field-pair">
      <label
        >Horizontal<select data-prop="align">
          ${options(['left', 'center', 'right'], alignment)}
        </select></label
      ><label
        >Vertical<select data-prop="verticalAlign">
          ${options(['top', 'middle', 'bottom'], vertical)}
        </select></label
      >
    </div>
    ${field(
      'Text padding (px)',
      'padding',
      o.padding ?? (o.type === 'note' ? 14 : shaped ? 12 : 0),
      0,
      500
    )}
    ${o.type !== 'text'
      ? /* HTML */ `<label
          >Text color<input type="color" data-prop="textColor" value="${o.textColor || '#252722'}"
        /></label>`
      : /* HTML */ `<label class="check-row"
          ><input
            type="checkbox"
            data-prop="autoHeight"
            ${o.autoHeight !== false ? 'checked' : ''}
          />
          Grow height to fit wrapped text</label
        >`}
    <p class="muted">
      Text wraps to the available
      width.${layoutFor(o).overflow
        ? ' Text exceeds the height; enlarge the box or reduce text size/padding.'
        : ''}
    </p>`;
}

function styleFields(o) {
  return /* HTML */ `<h3>Appearance</h3>
    <div class="field-pair">
      <label
        >Fill
        <div class="color-field">
          <input
            type="color"
            data-prop="fill"
            value="${o.fill === 'none' ? '#ffffff' : o.fill}"
          /><span>${o.fill === 'none' ? 'None' : o.fill}</span>
        </div></label
      ><label
        >Stroke
        <div class="color-field">
          <input
            type="color"
            data-prop="stroke"
            value="${o.stroke === 'none' ? '#252722' : o.stroke}"
          /><span>${o.stroke}</span>
        </div></label
      >
    </div>
    <label class="check-row"
      ><input type="checkbox" data-prop="noFill" ${o.fill === 'none' ? 'checked' : ''} /> No
      fill</label
    >
    <div class="field-pair">
      <label
        >Line weight<input
          type="number"
          data-prop="strokeWidth"
          min="0"
          max="30"
          value="${o.strokeWidth}" /></label
      ><label
        >Outline<select data-prop="sketch">
          <option value="false" ${!o.sketch ? 'selected' : ''}>Clean</option>
          <option value="true" ${o.sketch ? 'selected' : ''}>Sketch</option>
        </select></label
      >
    </div>`;
}

const icons = {
  select: '<path d="m5 3 13 9-7 1-3 7z"/>',
  hand: '<path d="M8 11V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6-3a1.5 1.5 0 0 1 3 0v7c0 4-3 6-6 6-3 0-5-2-7-5l-3-4c-1-2 1-3 2-2l2 2"/>',
  rect: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="8"/>',
  pen: '<path d="m4 20 1-6L16 3l5 5L10 19zM14 5l5 5"/>',
  text: '<path d="M4 5h16M12 5v15M8 20h8"/>',
  note: '<path d="M4 4h16v12l-5 5H4zM15 21v-6h5M8 9h8M8 12h5"/>',
  arrow: '<path d="M4 20 20 4M9 4h11v11"/>',
  line: '<path d="M4 20 20 4"/>'
};
const shortcuts = {
  select: 'V',
  hand: 'H',
  rect: 'R',
  ellipse: 'O',
  pen: 'P',
  text: 'T',
  note: 'N',
  arrow: 'A',
  line: 'L'
};
$('#tools').innerHTML = Object.entries(icons)
  .map(
    ([name, paths]) =>
      /* HTML */ `<button
        data-tool="${name}"
        title="${name} (${shortcuts[name]})"
        aria-label="${name} (${shortcuts[name]})"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          ${paths}
        </svg>
      </button>`
  )
  .join('');

function setTool(name) {
  tool = name;
  for (const button of $('#tools').children) {
    button.classList.toggle('active', button.dataset.tool === tool);
    button.setAttribute('aria-pressed', button.dataset.tool === tool);
  }
  if (tool === 'select') {
    stage.style.cursor = 'default';
    $('#hint').textContent =
      'Shift/Ctrl-click: multi-select · Alt-click: group part · double-click: text';
  } else if (tool === 'hand') {
    stage.style.cursor = 'grab';
    $('#hint').textContent = 'Drag to look around. Your ideas stay put.';
  } else {
    const toolLabel = tool === 'ellipse' ? 'an ellipse' : `a ${tool}`;
    stage.style.cursor = 'crosshair';
    $('#hint').textContent = `Drag to draw ${toolLabel} · tool stays active · V: select`;
  }
}

const previews = {
  button:
    '<rect x="17" y="9" width="66" height="25" rx="4" fill="#253e83"/><text x="50" y="25" text-anchor="middle" fill="#fff" stroke="none" font-size="9">Button</text>',
  input:
    '<text x="10" y="10" stroke="none" font-size="6">Field label</text><rect x="10" y="16" width="80" height="20" rx="2"/><path d="M17 25h35"/>',
  checkbox:
    '<rect x="10" y="14" width="14" height="14" rx="2"/><path d="m13 21 3 3 5-7M34 21h52"/>',
  dropdown: '<rect x="8" y="10" width="84" height="26" rx="2"/><path d="m75 20 5 5 5-5M16 23h39"/>',
  card: '<rect x="18" y="3" width="65" height="35" rx="5"/><path d="M27 13h30M27 21h45M27 28h33"/>',
  navbar:
    '<rect x="3" y="10" width="94" height="25"/><path d="M10 22h20M48 22h10M65 22h10M81 22h10"/>',
  image:
    '<rect x="19" y="3" width="62" height="35"/><path d="m19 38 22-22 18 16 10-9 12 15"/><circle cx="65" cy="13" r="4"/>',
  device: '<rect x="36" y="1" width="28" height="39" rx="5"/><path d="M45 6h10M46 35h8"/>'
};
$('#components').innerHTML = Object.entries(previews)
  .map(
    ([name, paths]) =>
      /* HTML */ `<button class="component" data-component="${name}" title="Add editable ${name}">
        <svg viewBox="0 0 100 42" fill="none" stroke="currentColor" stroke-width="1.2">${paths}</svg
        >${name[0].toUpperCase() + name.slice(1)}
      </button>`
  )
  .join('');

$('#tools').addEventListener('click', (event) => {
  const button = event.target.closest('[data-tool]');
  if (button) setTool(button.dataset.tool);
});
$('#components').addEventListener('click', (event) => {
  const button = event.target.closest('[data-component]');
  if (!button) return;
  const objects = component(button.dataset.component, 0, 0);
  const box = bounds(objects);
  const cx = Math.max(
    0,
    Math.min(page().width - box.w, (stage.clientWidth / 2 - offset.x) / zoom - box.w / 2)
  );
  const cy = Math.max(
    0,
    Math.min(page().height - box.h, (stage.clientHeight / 2 - offset.y) / zoom - box.h / 2)
  );
  for (const o of objects) {
    o.x += snapped(cx);
    o.y += snapped(cy);
    o.sketch = draftStyle.sketch;
  }
  mutate(() => {
    page().objects.push(...objects);
    selected = new Set(objects.map((o) => o.id));
  });
  setTool('select');
});
$('#page-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-page]');
  if (!button) return;
  activePage = button.dataset.page;
  selected.clear();
  render();
  fit();
});
$('#layers').addEventListener('click', (event) => {
  const button = event.target.closest('[data-layer]');
  if (button) {
    selectObject(
      button.dataset.layer,
      event.shiftKey || event.ctrlKey || event.metaKey,
      event.altKey
    );
    render();
  }
});

stage.addEventListener('pointerdown', (event) => {
  if (event.target.closest('.inline-text-editor')) return;
  if (event.button !== 0 && event.button !== 1) return;
  event.preventDefault();
  stage.focus();
  stage.setPointerCapture(event.pointerId);
  const pos = pointer(event);
  if (spaceHeld || tool === 'hand' || event.button === 1) {
    interaction = {
      kind: 'pan',
      start: { x: event.clientX, y: event.clientY },
      original: { ...offset }
    };
    return;
  }
  const handle = event.target.closest('[data-handle]')?.dataset.handle;
  if (tool === 'select' && handle) {
    interaction = {
      kind: 'resize',
      handle,
      start: pos,
      box: bounds(chosen()),
      original: clone(chosen())
    };
    return;
  }
  const id = event.target.closest('[data-id]')?.dataset.id;
  if (tool === 'select') {
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    if (
      id &&
      !additive &&
      lastCanvasClick?.id === id &&
      performance.now() - lastCanvasClick.time < 450 &&
      Math.hypot(pos.x - lastCanvasClick.x, pos.y - lastCanvasClick.y) * zoom < 5
    ) {
      interaction = null;
      lastCanvasClick = null;
      editCanvasObject(id, event.altKey);
      return;
    }
    lastCanvasClick = id && !additive ? { id, time: performance.now(), ...pos } : null;
    if (id) {
      if (!selected.has(id) || additive || event.altKey) selectObject(id, additive, event.altKey);
      interaction = { kind: 'move', start: pos, original: clone(chosen()), box: bounds(chosen()) };
      render();
    } else {
      if (!additive) selected.clear();
      interaction = { kind: 'marquee', start: pos, current: pos, previous: new Set(selected) };
      render();
    }
    return;
  }
  if (pos.x < 0 || pos.y < 0 || pos.x > page().width || pos.y > page().height) {
    notify('Start your drawing inside the white page.');
    return;
  }
  const start = { x: snapped(pos.x), y: snapped(pos.y) };
  const object = shape(tool, start.x, start.y, 1, 1, { ...draftStyle });
  if (tool === 'text') {
    object.text = 'Your text';
    object.fill = draftStyle.stroke;
    object.w = 220;
    object.h = 40;
  }
  if (tool === 'note') {
    object.text = 'Add a design note';
    object.fill = '#fff0bb';
    object.annotation = true;
    object.w = 240;
    object.h = 110;
  }
  if (tool === 'arrow') object.annotation = true;
  if (tool === 'pen') object.points = [[0, 0]];
  page().objects.push(object);
  selected = new Set([object.id]);
  interaction = { kind: 'create', start, object, points: [pos] };
  draw();
});

stage.addEventListener('pointermove', (event) => {
  if (!interaction) return;
  const pos = pointer(event),
    state = interaction;
  if (state.kind === 'pan') {
    offset = {
      x: state.original.x + event.clientX - state.start.x,
      y: state.original.y + event.clientY - state.start.y
    };
    draw();
    return;
  }
  if (state.kind === 'marquee') {
    state.current = pos;
    draw();
    return;
  }
  if (state.kind === 'move') {
    let dx = pos.x - state.start.x,
      dy = pos.y - state.start.y;
    if (!state.moved && Math.hypot(dx, dy) * zoom < 3) return;
    state.moved = true;
    lastCanvasClick = null;
    if (!state.box) return;
    dx = snapped(state.box.x + dx) - state.box.x;
    dy = snapped(state.box.y + dy) - state.box.y;
    delete state.guideX;
    delete state.guideY;
    if ($('#guides').checked) {
      const others = page().objects.filter((o) => !selected.has(o.id));
      const xs = [
        0,
        page().width / 2,
        page().width,
        ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])
      ];
      const ys = [
        0,
        page().height / 2,
        page().height,
        ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])
      ];
      for (const anchor of [0, state.box.w / 2, state.box.w]) {
        const target = xs.find((x) => Math.abs(x - (state.box.x + dx + anchor)) < 5 / zoom);
        if (target !== undefined) {
          dx = target - state.box.x - anchor;
          state.guideX = target;
          break;
        }
      }
      for (const anchor of [0, state.box.h / 2, state.box.h]) {
        const target = ys.find((y) => Math.abs(y - (state.box.y + dy + anchor)) < 5 / zoom);
        if (target !== undefined) {
          dy = target - state.box.y - anchor;
          state.guideY = target;
          break;
        }
      }
    }
    for (const original of state.original) {
      const o = page().objects.find((o) => o.id === original.id);
      o.x = original.x + dx;
      o.y = original.y + dy;
    }
  } else if (state.kind === 'resize') {
    const original = state.box,
      next = { ...original };
    const x = snapped(pos.x),
      y = snapped(pos.y);
    if (state.handle.includes('e')) next.w = Math.max(1, x - original.x);
    if (state.handle.includes('s')) next.h = Math.max(1, y - original.y);
    if (state.handle.includes('w')) {
      next.x = Math.min(x, original.x + original.w - 1);
      next.w = original.x + original.w - next.x;
    }
    if (state.handle.includes('n')) {
      next.y = Math.min(y, original.y + original.h - 1);
      next.h = original.y + original.h - next.y;
    }
    const updated = clone(state.original);
    resizeObjects(updated, original, next);
    for (const o of updated)
      Object.assign(
        page().objects.find((item) => item.id === o.id),
        o
      );
  } else if (state.kind === 'create') {
    const object = state.object;
    if (object.type === 'pen') {
      state.points.push(pos);
      const xs = state.points.map((p) => p.x),
        ys = state.points.map((p) => p.y);
      object.x = Math.min(...xs);
      object.y = Math.min(...ys);
      object.w = Math.max(1, Math.max(...xs) - object.x);
      object.h = Math.max(1, Math.max(...ys) - object.y);
      object.points = state.points.map((p) => [
        (p.x - object.x) / object.w,
        (p.y - object.y) / object.h
      ]);
    } else {
      const end = { x: snapped(pos.x), y: snapped(pos.y) };
      if (['line', 'arrow'].includes(object.type)) {
        object.w = end.x - state.start.x;
        object.h = end.y - state.start.y;
      } else {
        const rect = normalized(state.start, end);
        Object.assign(object, rect, { w: Math.max(1, rect.w), h: Math.max(1, rect.h) });
      }
    }
  }
  draw();
});

function finishInteraction() {
  const state = interaction;
  if (!state) return;
  interaction = null;
  if (state.kind === 'marquee') {
    const rect = normalized(state.start, state.current);
    selected = state.previous;
    for (const o of page().objects) {
      const b = bounds([o]);
      if (
        b.x >= rect.x &&
        b.y >= rect.y &&
        b.x + b.w <= rect.x + rect.w &&
        b.y + b.h <= rect.y + rect.h
      ) {
        const ids = o.group
          ? page()
              .objects.filter((p) => p.group === o.group)
              .map((p) => p.id)
          : [o.id];
        for (const id of ids) selected.add(id);
      }
    }
    render();
    return;
  }
  if (state.kind === 'create') {
    const o = state.object;
    if (Math.abs(o.w) < 5 && Math.abs(o.h) < 5) {
      const sizes = {
        rect: [180, 120],
        ellipse: [140, 140],
        text: [220, 40],
        note: [240, 110],
        line: [150, 0],
        arrow: [150, 0],
        pen: [1, 1]
      };
      [o.w, o.h] = sizes[o.type];
      if (o.type === 'pen')
        o.points = [
          [0, 0],
          [1, 1]
        ];
    }
  }
  if (state.kind === 'resize') chosen().forEach(growText);
  if (state.kind !== 'pan') commit();
  else draw();
  if (state.kind === 'create' && ['text', 'note'].includes(state.object.type))
    beginEditing(state.object);
}
stage.addEventListener('pointerup', finishInteraction);
stage.addEventListener('pointercancel', () => cancelInteraction());
function cancelInteraction() {
  if (interaction?.kind === 'create')
    page().objects = page().objects.filter((o) => o.id !== interaction.object.id);
  if (interaction?.original && Array.isArray(interaction.original)) {
    for (const o of interaction.original)
      Object.assign(
        page().objects.find((item) => item.id === o.id),
        o
      );
  }
  interaction = null;
  render();
}
function editCanvasObject(id, individual = false) {
  let o = page().objects.find((o) => o.id === id);
  if (o?.type === 'image') {
    imageTools.open(o);
    return;
  }
  if (!o || !['text', 'note', 'rect', 'ellipse'].includes(o.type)) return;
  if (o.group && !individual && !['text', 'note'].includes(o.type)) {
    const labels = page().objects.filter((part) => part.group === o.group && part.type === 'text');
    o =
      labels.find(
        (part) => part.x >= o.x && part.y >= o.y && part.x < o.x + o.w && part.y < o.y + o.h
      ) ||
      labels[0] ||
      o;
  }
  beginEditing(o);
}
stage.addEventListener('dblclick', (event) => {
  if (tool !== 'select' || editing) return;
  editCanvasObject(event.target.closest('[data-id]')?.dataset.id, event.altKey);
});
stage.addEventListener(
  'wheel',
  (event) => {
    if (event.target.closest('.inline-text-editor')) return;
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const rect = stage.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.002), event.clientX - rect.left, event.clientY - rect.top);
    } else {
      offset.x -= event.deltaX;
      offset.y -= event.deltaY;
      draw();
    }
  },
  { passive: false }
);

$('#inspector-content').addEventListener('change', (event) => {
  const target = event.target;
  if (target.dataset.pageProp) {
    mutate(() => {
      page()[target.dataset.pageProp] = target.value || 'Untitled screen';
    });
    return;
  }
  if (target.id === 'object-text' || target.dataset.textId) {
    const object = target.dataset.textId
      ? page().objects.find((o) => o.id === target.dataset.textId)
      : chosen()[0];
    if (object)
      mutate(() => {
        object.text = target.value;
        growText(object);
      });
    return;
  }
  const prop = target.dataset.prop;
  if (!prop) return;
  if (['pageWidth', 'pageHeight'].includes(prop)) {
    const value = Number(target.value);
    if (!Number.isFinite(value) || value < 100 || value > 8000) {
      notify('Page dimensions must be between 100 and 8000 pixels.');
      render();
      return;
    }
    mutate(() => {
      page()[prop === 'pageWidth' ? 'width' : 'height'] = value;
    });
    fit();
    return;
  }
  let value =
    target.type === 'checkbox'
      ? target.checked
      : target.type === 'number'
        ? Number(target.value)
        : target.value;
  if (
    target.type === 'number' &&
    (!Number.isFinite(value) || value < Number(target.min) || value > Number(target.max))
  ) {
    notify('Use a number within the field’s allowed range.');
    renderInspector();
    return;
  }
  if (prop === 'sketch') value = value === 'true';
  const objects = chosen();
  if (!objects.length) {
    draftStyle[prop === 'noFill' ? 'fill' : prop] =
      prop === 'noFill' ? (value ? 'none' : '#faf6ed') : value;
    renderInspector();
    return;
  }
  mutate(() => {
    if (['x', 'y', 'w', 'h'].includes(prop)) {
      const original = bounds(objects);
      const next = { ...original, [prop]: value };
      resizeObjects(objects, original, next);
    } else
      for (const o of objects)
        o[prop === 'noFill' ? 'fill' : prop] =
          prop === 'noFill' ? (value ? 'none' : '#faf6ed') : value;
    if (['w', 'fontSize', 'padding', 'autoHeight'].includes(prop)) objects.forEach(growText);
  });
});

const clipboardPrefix = 'SKETCHROOM_OBJECTS\n';
function copySelection(event) {
  if (!chosen().length) return;
  copiedObjects = clone(chosen());
  pasteCount = 0;
  const data = clipboardPrefix + JSON.stringify(copiedObjects);
  if (event?.clipboardData) {
    event.preventDefault();
    event.clipboardData.setData('text/plain', data);
  } else navigator.clipboard?.writeText(data).catch(() => {});
  if (copiedObjects.length === 1 && copiedObjects[0].type === 'image')
    imageTools.copyImage(copiedObjects[0], data);
  notify(`${copiedObjects.length} objects copied. Ctrl+V to paste.`);
  renderInspector();
}

function pasteSelection(objects = copiedObjects) {
  if (!objects?.length) return;
  try {
    const validationPage = newPage();
    validationPage.objects = objects;
    validateProject({
      format: 'sketchroom',
      version: 1,
      name: 'Clipboard',
      pages: [validationPage]
    });
    const copies = clone(objects);
    remapObjects(copies);
    const shift = 20 * ++pasteCount;
    for (const object of copies) {
      object.x += shift;
      object.y += shift;
    }
    mutate(() => {
      page().objects.push(...copies);
      selected = new Set(copies.map((o) => o.id));
    });
    setTool('select');
  } catch (error) {
    notify(`Could not paste objects: ${error.message}`);
  }
}

function typingIn(target) {
  return target?.matches('input, textarea, select, [contenteditable]');
}
document.addEventListener('copy', (event) => {
  if (!typingIn(event.target) && !$('dialog[open]')) copySelection(event);
});
document.addEventListener('paste', (event) => {
  if (typingIn(event.target) || $('dialog[open]')) return;
  const data = event.clipboardData?.getData('text/plain') || '';
  if (!data.startsWith(clipboardPrefix)) {
    const image = [...(event.clipboardData?.items || [])].find((item) =>
      item.type.startsWith('image/')
    );
    if (image) {
      event.preventDefault();
      imageTools.importFile(image.getAsFile());
    }
    return;
  }
  event.preventDefault();
  try {
    if (data.length > 25 * 1024 * 1024) throw new Error('Clipboard selection is too large.');
    const objects = JSON.parse(data.slice(clipboardPrefix.length));
    pasteSelection(objects);
  } catch (error) {
    notify(`Could not paste objects: ${error.message}`);
  }
});

function action(name) {
  if (name === 'edit-image') {
    if (chosen()[0]?.type === 'image') imageTools.open(chosen()[0]);
    return;
  }
  if (name === 'copy-image') {
    if (chosen()[0]?.type === 'image') imageTools.copyImage(chosen()[0]);
    return;
  }
  if (name === 'copy') {
    copySelection();
    return;
  }
  if (name === 'paste') {
    pasteSelection();
    return;
  }
  const objects = chosen();
  if (name === 'delete-page') {
    if (
      project.pages.length < 2 ||
      !confirm(`Delete “${page().name}” and its objects? You can undo this.`)
    )
      return;
    mutate(() => {
      project.pages = project.pages.filter((p) => p.id !== activePage);
      activePage = project.pages[0].id;
      selected.clear();
    });
    fit();
    return;
  }
  if (name === 'duplicate-page') {
    mutate(() => {
      const copy = clone(page());
      copy.id = uid();
      copy.name += ' copy';
      remapObjects(copy.objects);
      project.pages.push(copy);
      activePage = copy.id;
      selected.clear();
    });
    fit();
    return;
  }
  if (!objects.length) return;
  mutate(() => {
    if (name === 'delete') {
      page().objects = page().objects.filter((o) => !selected.has(o.id));
      selected.clear();
    }
    if (name === 'duplicate') {
      const copies = clone(objects);
      remapObjects(copies);
      for (const o of copies) {
        o.x += 20;
        o.y += 20;
      }
      page().objects.push(...copies);
      selected = new Set(copies.map((o) => o.id));
    }
    if (name === 'front')
      page().objects = [...page().objects.filter((o) => !selected.has(o.id)), ...objects];
    if (name === 'back')
      page().objects = [...objects, ...page().objects.filter((o) => !selected.has(o.id))];
    if (name === 'group') {
      const group = uid();
      for (const o of objects) o.group = group;
    }
    if (name === 'ungroup') for (const o of objects) delete o.group;
    if (['left', 'right', 'center', 'top', 'middle', 'bottom'].includes(name)) {
      const box = bounds(objects);
      // Align groups as units so UI components retain their internal layout.
      const units = new Map();
      for (const o of objects) {
        const key = o.group || o.id;
        if (!units.has(key)) units.set(key, []);
        units.get(key).push(o);
      }
      for (const unit of units.values()) {
        const b = bounds(unit);
        const reference =
          units.size === 1 ? { x: 0, y: 0, w: page().width, h: page().height } : box;
        let dx = 0,
          dy = 0;
        if (name === 'left') dx = reference.x - b.x;
        if (name === 'right') dx = reference.x + reference.w - b.x - b.w;
        if (name === 'center') dx = reference.x + reference.w / 2 - b.x - b.w / 2;
        if (name === 'top') dy = reference.y - b.y;
        if (name === 'bottom') dy = reference.y + reference.h - b.y - b.h;
        if (name === 'middle') dy = reference.y + reference.h / 2 - b.y - b.h / 2;
        for (const o of unit) {
          o.x += dx;
          o.y += dy;
        }
      }
    }
  });
}
function remapObjects(objects) {
  const groups = new Map();
  for (const o of objects) {
    o.id = uid();
    if (o.group) {
      if (!groups.has(o.group)) groups.set(o.group, uid());
      o.group = groups.get(o.group);
    }
  }
}
$('#inspector-content').addEventListener('click', (event) => {
  const part = event.target.closest('[data-part]');
  if (part) {
    selected = new Set([part.dataset.part]);
    render();
    return;
  }
  const edit = event.target.closest('[data-edit-text]');
  if (edit) {
    const object = page().objects.find((o) => o.id === edit.dataset.editText);
    if (object) beginEditing(object);
    return;
  }
  const button = event.target.closest('[data-action]');
  if (button) action(button.dataset.action);
});

function undo(redo = false) {
  const next = redo ? history.redo() : history.undo();
  if (next) {
    project = next;
    selected.clear();
    render();
  }
}
function download(blob, filename) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function filename(value) {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100) || 'SketchUI';
}
async function save(saveAs = false) {
  if (pendingSave) {
    notify('Finish the current save first.');
    return;
  }
  const snapshot = JSON.stringify(project);
  if (new Blob([snapshot]).size > 100 * 1024 * 1024) {
    notify('This project exceeds 100 MB. Remove some large images before saving.');
    return;
  }
  if (window.desktop?.saveProject) {
    pendingSave = { snapshot };
    try {
      const result = await window.desktop.saveProject(JSON.stringify(project, null, 2), saveAs);
      if (result) {
        savedState = snapshot;
        notify('Saved to ' + result.path);
      } else notify('Save canceled. Your changes are still available.');
    } catch (error) {
      notify('Could not save project: ' + error.message);
    } finally {
      pendingSave = null;
      render();
    }
    return;
  }
  download(
    new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
    filename(project.name) + '.sketchui'
  );
  savedState = snapshot;
  render();
  notify('Project download requested.');
}
async function openProject() {
  if (pendingSave) {
    notify('Finish the current save first.');
    return;
  }
  if (!window.desktop?.openProject) {
    $('#file-input').click();
    return;
  }
  if (dirty() && !confirm('Open a project and discard unsaved changes?')) return;
  try {
    const content = await window.desktop.openProject();
    if (content === null) return;
    const next = validateProject(JSON.parse(content));
    await window.desktop.acceptProject();
    replaceProject(next, true);
    notify('Project opened. Everything is editable.');
  } catch (error) {
    notify('Could not open project: ' + error.message);
  }
}
window.desktop?.onDownload((result) => {
  if (result.filename.endsWith('.png')) {
    notify(
      result.state === 'completed'
        ? 'PNG saved. Ready for your next design conversation.'
        : 'PNG download canceled or interrupted. Export again to retry.'
    );
  }
});
function replaceProject(next, saved = false) {
  project = next;
  history = new History(project);
  activePage = page().id;
  selected.clear();
  savedState = saved ? JSON.stringify(project) : '';
  render();
  fit();
}
$('#project-name').addEventListener('change', (event) =>
  mutate(() => {
    project.name = event.target.value.trim() || 'Untitled project';
  })
);
$('#save-project').addEventListener('click', () => save());
$('#save-as-project').addEventListener('click', () => save(true));
$('#open-project').addEventListener('click', openProject);
$('#file-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 100 * 1024 * 1024) throw new Error('Choose a project smaller than 100 MB.');
    const next = validateProject(JSON.parse(await file.text()));
    if (dirty() && !confirm('Open this project and discard unsaved changes?')) return;
    await window.desktop?.resetProject();
    replaceProject(next, true);
    notify('Project opened. Everything is editable.');
  } catch (error) {
    notify(`Could not open project: ${error.message}`);
  } finally {
    event.target.value = '';
  }
});
$('#new-project').addEventListener('click', async () => {
  if (pendingSave) {
    notify('Finish the current save first.');
    return;
  }
  if (dirty() && !confirm('Start a new project and discard unsaved changes?')) return;
  await window.desktop?.resetProject();
  replaceProject({
    format: 'sketchroom',
    version: 1,
    name: 'Untitled project',
    pages: [newPage()]
  });
});
$('#add-page').addEventListener('click', () => {
  $('#page-dialog').showModal();
  $('#new-page-name').focus();
  $('#new-page-name').select();
});
$('#page-preset').addEventListener('change', (event) => {
  if (event.target.value === 'custom') return;
  const [w, h] = event.target.value.split(',');
  $('#new-page-width').value = w;
  $('#new-page-height').value = h;
});
$('#page-dialog').addEventListener('close', () => {
  if ($('#page-dialog').returnValue !== 'create') return;
  const next = newPage(
    $('#new-page-name').value.trim() || 'Untitled screen',
    Number($('#new-page-width').value),
    Number($('#new-page-height').value)
  );
  if (next.width < 100 || next.height < 100 || next.width > 8000 || next.height > 8000) return;
  mutate(() => {
    project.pages.push(next);
    activePage = next.id;
    selected.clear();
  });
  fit();
});
$('#export').addEventListener('click', () => $('#export-dialog').showModal());
$('#export-dialog').addEventListener('close', async () => {
  if ($('#export-dialog').returnValue !== 'export') return;
  try {
    const scale = Number($('#export-scale').value);
    if (page().width * page().height * scale * scale > 64000000)
      throw new Error('This page is too large at 2×. Choose 1× or reduce its dimensions.');
    const svg = element('svg', {
      xmlns: svgNS,
      width: page().width * scale,
      height: page().height * scale,
      viewBox: `0 0 ${page().width} ${page().height}`
    });
    svg.append(
      element('rect', { width: page().width, height: page().height, fill: page().background })
    );
    svg.append(artwork($('#export-annotations').checked, true));
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: 'image/svg+xml;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const output = document.createElement('canvas');
      output.width = page().width * scale;
      output.height = page().height * scale;
      const context = output.getContext('2d');
      if (!context) throw new Error('Image rendering is unavailable.');
      context.drawImage(image, 0, 0);
      const png = await new Promise((resolve) => output.toBlob(resolve, 'image/png'));
      if (!png) throw new Error('The image could not be created. Try a smaller page.');
      download(png, `${filename(page().name)}.png`);
      if (!window.desktop)
        notify('PNG download requested. Ready for your next design conversation.');
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    notify(`Export failed: ${error.message}`);
  }
});
$('#help').addEventListener('click', () => $('#help-dialog').showModal());
$('#credits').addEventListener('click', async () => {
  let dialog = $('#credits-dialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'credits-dialog';
    dialog.innerHTML =
      '<form method="dialog"><h2>Made possible by open source.</h2><pre></pre><button class="primary">Close</button></form>';
    document.body.append(dialog);
  }
  dialog.querySelector('pre').textContent = 'Loading credits…';
  dialog.showModal();
  try {
    dialog.querySelector('pre').textContent = window.desktop
      ? await window.desktop.readCredits()
      : 'Automatic local cutouts use IMG.LY background-removal-node (AGPL-3.0). Full notices and license text are included in the desktop app and project dependencies. See THIRD_PARTY_NOTICES.md.';
  } catch (error) {
    dialog.querySelector('pre').textContent =
      `Could not load credits: ${error.message}. See THIRD_PARTY_NOTICES.md in the project.`;
  }
});
$('#import-image').addEventListener('click', () => $('#image-input').click());
$('#image-input').addEventListener('change', (event) => {
  for (const file of event.target.files) imageTools.importFile(file);
  event.target.value = '';
});
stage.addEventListener('dragover', (event) => {
  if ([...event.dataTransfer.types].includes('Files')) event.preventDefault();
});
stage.addEventListener('drop', (event) => {
  event.preventDefault();
  for (const file of event.dataTransfer.files) imageTools.importFile(file);
});
$('#undo').addEventListener('click', () => undo());
$('#redo').addEventListener('click', () => undo(true));
$('#fit').addEventListener('click', fit);
$('#zoom-in').addEventListener('click', () => zoomAt(1.2));
$('#zoom-out').addEventListener('click', () => zoomAt(1 / 1.2));

document.addEventListener('keydown', (event) => {
  const typing = event.target.matches('input, textarea, select, [contenteditable]');
  const command = event.ctrlKey || event.metaKey;
  if ($('dialog[open]')) return;
  if (command && ['s', 'o'].includes(event.key.toLowerCase())) {
    event.preventDefault();
    event.target.blur();
    event.key.toLowerCase() === 's' ? save(event.shiftKey) : openProject();
    return;
  }
  if (typing) return;
  if (event.code === 'Space') {
    event.preventDefault();
    spaceHeld = true;
    stage.style.cursor = 'grab';
    return;
  }
  if (event.key === 'Escape') {
    cancelInteraction();
    selected.clear();
    setTool('select');
    render();
    return;
  }
  if (command) {
    const key = event.key.toLowerCase();
    if (['z', 'y', 'd', 'g', 'a', '=', '-', '0'].includes(key)) event.preventDefault();
    if (key === 'z') undo(event.shiftKey);
    if (key === 'y') undo(true);
    if (key === 'd') action('duplicate');
    if (key === 'g') action(event.shiftKey ? 'ungroup' : 'group');
    if (key === 'a') {
      selected = new Set(page().objects.map((o) => o.id));
      render();
    }
    if (key === '=') zoomAt(1.2);
    if (key === '-') zoomAt(1 / 1.2);
    if (key === '0') fit();
    return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    action('delete');
  }
  if (event.key.startsWith('Arrow') && chosen().length) {
    event.preventDefault();
    const amount = event.shiftKey ? 10 : 1;
    mutate(() => {
      for (const o of chosen()) {
        if (event.key === 'ArrowLeft') o.x -= amount;
        if (event.key === 'ArrowRight') o.x += amount;
        if (event.key === 'ArrowUp') o.y -= amount;
        if (event.key === 'ArrowDown') o.y += amount;
      }
    });
  }
  const entry = Object.entries(shortcuts).find(
    ([, key]) => key.toLowerCase() === event.key.toLowerCase()
  );
  if (entry) setTool(entry[0]);
  if (event.key === '?') $('#help-dialog').showModal();
});
document.addEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    spaceHeld = false;
    setTool(tool);
  }
});
window.addEventListener('blur', () => {
  spaceHeld = false;
  finishInteraction();
});
window.addEventListener('beforeunload', (event) => {
  if (!window.desktop && dirty()) {
    event.preventDefault();
    event.returnValue = '';
  }
});
new ResizeObserver(fit).observe(stage);
setTool('select');
render();
requestAnimationFrame(fit);
