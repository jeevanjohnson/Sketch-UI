// Owns image import, the reversible crop/cutout dialog, and clipboard rasterization.
// The host supplies page ownership checks and undoable mutations; decoded pixels
// stay in the renderer, with cutouts delegated to local workers/desktop IPC.
import { shape } from './model.mjs';
import { validCrop } from './image-processing.mjs';

const fullCrop = () => ({ x: 0, y: 0, w: 1, h: 1 });
const loadImage = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This image could not be decoded.'));
    image.src = source;
  });
const canvasOf = (width, height) =>
  Object.assign(document.createElement('canvas'), { width, height });

export function createImageTools(host) {
  const dialog = document.createElement('dialog');
  dialog.id = 'image-dialog';
  dialog.innerHTML = /* HTML */ `<form method="dialog">
    <div class="image-dialog-heading">
      <div>
        <span class="eyebrow">YOUR IMAGES, YOUR COMPUTER</span>
        <h2>A little more focus.</h2>
      </div>
      <button value="cancel" aria-label="Close image editor">×</button>
    </div>
    <div class="image-editor-grid">
      <div>
        <div class="image-preview-wrap">
          <canvas
            id="image-preview"
            aria-label="Drag to crop the image, or choose Sample color then click a background"
          ></canvas>
        </div>
        <div class="button-row">
          <button type="button" id="crop-mode" aria-pressed="true">Drag to crop</button
          ><button type="button" id="sample-mode" aria-pressed="false">Sample color</button
          ><button type="button" id="reset-crop">Reset crop</button>
        </div>
        <p class="muted">
          Drag a new crop on the preview. Image edits stay reversible until you apply them.
        </p>
      </div>
      <div class="image-options">
        <h3>Crop · percent of original</h3>
        <div class="field-pair">
          ${['x', 'y', 'w', 'h']
            .map(
              (key, i) =>
                /* HTML */ `<label
                  >${['Left', 'Top', 'Width', 'Height'][i]} %<input
                    type="number"
                    data-crop="${key}"
                    min="${i > 1 ? '.1' : '0'}"
                    max="100"
                    step=".1"
                /></label>`
            )
            .join('')}
        </div>
        <h3>Plain background</h3>
        <label>Background color<input type="color" id="background-color" value="#ffffff" /></label>
        <label
          >Tolerance
          <input type="range" id="background-tolerance" min="0" max="150" value="30" /><output
            id="tolerance-value"
            >30</output
          ></label
        >
        <label class="check-row"
          ><input type="checkbox" id="background-connected" checked /> Connected to edges /
          sample</label
        >
        <button type="button" id="remove-plain">Preview color removal</button>
        <h3>Automatic photo cutout</h3>
        <p class="muted">
          Find the subject using the bundled local model. No upload. Fine hair, shadows and
          transparent objects may need another approach.
        </p>
        <button type="button" id="remove-auto">Remove background locally</button
        ><button type="button" id="cancel-cutout" hidden>Cancel processing</button>
        <button type="button" id="restore-image">Restore original pixels</button>
      </div>
    </div>
    <p id="image-status" role="status" aria-live="polite"></p>
    <div class="dialog-actions">
      <button value="cancel">Cancel</button
      ><button id="apply-image" value="apply" class="primary">Apply image edits ↗</button>
    </div>
  </form>`;
  document.body.append(dialog);
  const q = (selector) => dialog.querySelector(selector);
  const preview = q('#image-preview');
  const context = preview.getContext('2d', { willReadFrequently: true });
  let state = null;
  let mode = 'crop';
  let drag = null;
  let busy = false;
  let localWorker = null;

  function status(message) {
    q('#image-status').textContent = message;
  }

  function busyState(value) {
    busy = value;
    for (const button of dialog.querySelectorAll('button')) button.disabled = value;
    q('#cancel-cutout').disabled = false;
    q('#cancel-cutout').hidden = !value;
    q('#remove-auto').disabled = value || !host.desktop;
    for (const input of dialog.querySelectorAll('input')) input.disabled = value;
  }

  function syncCrop() {
    for (const input of dialog.querySelectorAll('[data-crop]'))
      input.value = Number((state.crop[input.dataset.crop] * 100).toFixed(2));
  }

  function renderPreview() {
    if (!state?.image) return;
    context.clearRect(0, 0, preview.width, preview.height);
    context.drawImage(state.image, 0, 0, preview.width, preview.height);
    const c = state.crop,
      x = c.x * preview.width,
      y = c.y * preview.height,
      w = c.w * preview.width,
      h = c.h * preview.height;
    context.fillStyle = '#10203b99';
    context.fillRect(0, 0, preview.width, y);
    context.fillRect(0, y + h, preview.width, preview.height - y - h);
    context.fillRect(0, y, x, h);
    context.fillRect(x + w, y, preview.width - x - w, h);
    context.setLineDash([7, 4]);
    context.lineWidth = 2;
    context.strokeStyle = '#152d60';
    context.strokeRect(x, y, w, h);
    context.lineDashOffset = 6;
    context.strokeStyle = '#ffffff';
    context.strokeRect(x, y, w, h);
    context.setLineDash([]);
  }

  async function showSource(source) {
    const current = state;
    const image = await loadImage(source);
    if (state !== current || !dialog.open) return;
    state.workingSource = source;
    state.image = image;
    const scale = Math.min(780 / image.naturalWidth, 490 / image.naturalHeight, 1);
    preview.width = Math.max(1, Math.round(image.naturalWidth * scale));
    preview.height = Math.max(1, Math.round(image.naturalHeight * scale));
    renderPreview();
  }

  function point(event) {
    const rect = preview.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }
  preview.addEventListener('pointerdown', (event) => {
    if (busy || !state?.image) return;
    event.preventDefault();
    const p = point(event);
    if (mode === 'sample') {
      const sample = canvasOf(state.image.naturalWidth, state.image.naturalHeight);
      const ctx = sample.getContext('2d');
      ctx.drawImage(state.image, 0, 0);
      const x = Math.min(sample.width - 1, Math.floor(p.x * sample.width)),
        y = Math.min(sample.height - 1, Math.floor(p.y * sample.height));
      const color = ctx.getImageData(x, y, 1, 1).data;
      q('#background-color').value =
        '#' +
        [...color]
          .slice(0, 3)
          .map((c) => c.toString(16).padStart(2, '0'))
          .join('');
      state.seed = { x, y };
      status('Background color sampled. Preview color removal to inspect the result.');
      return;
    }
    preview.setPointerCapture(event.pointerId);
    drag = p;
  });
  preview.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const p = point(event);
    const crop = {
      x: Math.min(drag.x, p.x),
      y: Math.min(drag.y, p.y),
      w: Math.abs(p.x - drag.x),
      h: Math.abs(p.y - drag.y)
    };
    if (validCrop(crop)) {
      state.crop = crop;
      syncCrop();
      renderPreview();
    }
  });
  const endDrag = () => {
    drag = null;
  };
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);
  for (const input of dialog.querySelectorAll('[data-crop]'))
    input.addEventListener('change', () => {
      if (!state) return;
      const crop = { ...state.crop, [input.dataset.crop]: Number(input.value) / 100 };
      if (validCrop(crop)) {
        state.crop = crop;
        renderPreview();
        status('Crop updated.');
      } else status('Keep the crop inside the original image with width and height above 0%.');
      syncCrop();
    });
  q('#reset-crop').onclick = () => {
    state.crop = fullCrop();
    syncCrop();
    renderPreview();
  };
  q('#crop-mode').onclick = () => {
    mode = 'crop';
    q('#crop-mode').setAttribute('aria-pressed', 'true');
    q('#sample-mode').setAttribute('aria-pressed', 'false');
    preview.style.cursor = 'crosshair';
  };
  q('#sample-mode').onclick = () => {
    mode = 'sample';
    q('#crop-mode').setAttribute('aria-pressed', 'false');
    q('#sample-mode').setAttribute('aria-pressed', 'true');
    preview.style.cursor = 'copy';
  };
  q('#background-tolerance').oninput = (event) => {
    q('#tolerance-value').value = event.target.value;
  };
  q('#background-color').onchange = () => {
    if (state) state.seed = null;
  };
  q('#remove-plain').onclick = async () => {
    busyState(true);
    status('Removing the selected background color locally…');
    const current = state;
    try {
      const image = await loadImage(state.baseSource);
      const output = canvasOf(image.naturalWidth, image.naturalHeight),
        ctx = output.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, output.width, output.height);
      const hex = q('#background-color').value;
      const color = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      localWorker = new Worker(new URL('./image-worker.mjs', import.meta.url), { type: 'module' });
      const result = await new Promise((resolve, reject) => {
        localWorker.onmessage = (event) => resolve(event.data);
        localWorker.onerror = () =>
          reject(new Error('Local processing failed. Try a smaller image.'));
        localWorker.postMessage(
          {
            pixels: pixels.data.buffer,
            width: output.width,
            height: output.height,
            color,
            tolerance: Number(q('#background-tolerance').value),
            connected: q('#background-connected').checked,
            seed: state.seed
          },
          [pixels.data.buffer]
        );
        current.cancelLocal = () => reject(new Error('Processing canceled.'));
      });
      ctx.putImageData(
        new ImageData(new Uint8ClampedArray(result), output.width, output.height),
        0,
        0
      );
      await showSource(output.toDataURL('image/png'));
      status('Preview ready. Adjust tolerance and preview again, or apply to keep it.');
    } catch (error) {
      status(error.message);
    } finally {
      localWorker?.terminate();
      localWorker = null;
      if (state === current) busyState(false);
    }
  };
  q('#remove-auto').onclick = async () => {
    busyState(true);
    status('Loading the local model… This may take a moment.');
    const current = state;
    try {
      await showSource(await host.desktop.removeBackground(state.baseSource));
      status('Local cutout ready. Inspect the preview, then apply or restore.');
    } catch (error) {
      status(`Cutout did not finish: ${error.message}`);
    } finally {
      if (state === current) busyState(false);
    }
  };
  q('#cancel-cutout').onclick = () => {
    state?.cancelLocal?.();
    localWorker?.terminate();
    host.desktop?.cancelBackground();
    status('Canceling processing…');
  };
  q('#restore-image').onclick = async () => {
    busyState(true);
    try {
      state.baseSource = state.object.originalSrc || state.object.src;
      await showSource(state.baseSource);
      status('Original pixels restored in preview. Apply to keep.');
    } catch (error) {
      status(error.message);
    } finally {
      busyState(false);
    }
  };
  host.desktop?.onBackgroundProgress((text) => {
    if (dialog.open && busy) status(text);
  });
  dialog.addEventListener('cancel', (event) => {
    if (busy) {
      event.preventDefault();
      q('#cancel-cutout').click();
    }
  });
  dialog.addEventListener('close', () => {
    if (state && dialog.returnValue === 'apply') {
      const current = state,
        o = current.object;
      if (host.isPagePresent(current.owner) && current.owner.objects.includes(o))
        host.mutate(() => {
          const old = o.crop || fullCrop();
          const next = current.crop;
          // Keep each original pixel at the same page position as crop bounds change.
          const pagePixelsPerCropX = o.w / old.w;
          const pagePixelsPerCropY = o.h / old.h;
          o.x += (next.x - old.x) * pagePixelsPerCropX;
          o.y += (next.y - old.y) * pagePixelsPerCropY;
          o.w = next.w * pagePixelsPerCropX;
          o.h = next.h * pagePixelsPerCropY;
          o.crop = { ...next };
          if (o.src !== current.workingSource && !o.originalSrc) o.originalSrc = o.src;
          o.src = current.workingSource;
        });
    }
    state = null;
    drag = null;
  });

  async function importFile(file) {
    if (!file || !/^image\/(png|jpeg|webp|gif|bmp)$/.test(file.type)) {
      host.notify('Choose a PNG, JPEG, WebP, GIF, or BMP image.');
      return;
    }
    const owner = host.getPage();
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Choose an image smaller than 20 MB.');
      const url = URL.createObjectURL(file);
      let image;
      try {
        image = await loadImage(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      const scale = Math.min(
        1,
        4096 / image.naturalWidth,
        4096 / image.naturalHeight,
        Math.sqrt(12000000 / (image.naturalWidth * image.naturalHeight))
      );
      const output = canvasOf(
        Math.max(1, Math.round(image.naturalWidth * scale)),
        Math.max(1, Math.round(image.naturalHeight * scale))
      );
      output.getContext('2d').drawImage(image, 0, 0, output.width, output.height);
      const source = output.toDataURL('image/png');
      if (source.length > 24000000)
        throw new Error('This image is too large to embed. Use a smaller image.');
      const displayScale = Math.min(
        1,
        (owner.width * 0.65) / output.width,
        (owner.height * 0.65) / output.height
      );
      const w = output.width * displayScale,
        h = output.height * displayScale;
      if (!host.isPagePresent(owner)) {
        host.notify('Image import canceled because its page was replaced.');
        return;
      }
      const o = shape('image', (owner.width - w) / 2, (owner.height - h) / 2, w, h, {
        src: source,
        pixelWidth: output.width,
        pixelHeight: output.height,
        crop: fullCrop(),
        name: file.name || 'Pasted image'
      });
      host.mutate(() => {
        owner.objects.push(o);
        if (host.getPage() === owner) host.select(o.id);
      });
      host.setTool('select');
      host.notify('Image added. Double-click it to crop or remove its background.');
    } catch (error) {
      host.notify(`Could not add image: ${error.message}`);
    }
  }

  async function open(object) {
    state = {
      object,
      owner: host.getPage(),
      baseSource: object.src,
      workingSource: object.src,
      crop: { ...(object.crop || fullCrop()) },
      image: null,
      seed: null
    };
    dialog.returnValue = 'cancel';
    dialog.showModal();
    busyState(true);
    status('Opening image…');
    syncCrop();
    q('#remove-auto').title = host.desktop
      ? 'Runs entirely on this computer'
      : 'Automatic cutouts are available in the desktop app';
    try {
      await showSource(object.src);
      status('Drag to crop, sample a plain background, or try a local photo cutout.');
    } catch (error) {
      status(error.message);
    } finally {
      busyState(false);
      q('#remove-auto').disabled = !host.desktop;
    }
  }

  async function raster(object) {
    const image = await loadImage(object.src),
      crop = object.crop || fullCrop();
    const output = canvasOf(
      Math.max(1, Math.round(image.naturalWidth * crop.w)),
      Math.max(1, Math.round(image.naturalHeight * crop.h))
    );
    output
      .getContext('2d')
      .drawImage(
        image,
        crop.x * image.naturalWidth,
        crop.y * image.naturalHeight,
        crop.w * image.naturalWidth,
        crop.h * image.naturalHeight,
        0,
        0,
        output.width,
        output.height
      );
    return output.toDataURL('image/png');
  }

  async function copyImage(object, text) {
    try {
      const source = await raster(object);
      if (host.desktop) await host.desktop.copyImage(source, text);
      else
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': await (await fetch(source)).blob() })
        ]);
      host.notify('Image copied. Paste it here or into another app.');
    } catch (error) {
      host.notify(`Could not copy image: ${error.message}`);
    }
  }
  return { importFile, open, copyImage };
}
