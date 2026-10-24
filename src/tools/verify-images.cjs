const { _electron: electron } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

(async () => {
  const root = path.resolve(__dirname, '..', '..'),
    artifacts = path.join(root, 'artifacts');
  await fs.mkdir(artifacts, { recursive: true });
  const fixture = await sharp({
    create: { width: 200, height: 160, channels: 4, background: '#ffffff' }
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="200" height="160"><rect x="60" y="40" width="80" height="80" rx="10" fill="#25408a"/></svg>'
        )
      }
    ])
    .png()
    .toBuffer();
  const fixtureSource = `data:image/png;base64,${fixture.toString('base64')}`;
  const packaged = process.argv.includes('--packaged');
  const app = await electron.launch({
    args: packaged ? [] : [root],
    executablePath: packaged
      ? path.join(root, 'releases', 'win-unpacked', 'SketchUI.exe')
      : require('electron')
  });
  try {
    const page = await app.firstWindow();
    page.setDefaultTimeout(15000);
    const applyImageEdits = async () => {
      await page.evaluate(() => {
        window.imageEditsApplied = false;
        document.querySelector('#image-dialog').addEventListener(
          'close',
          () => {
            window.imageEditsApplied = true;
          },
          { once: true }
        );
      });
      await page.locator('#apply-image').click();
      await page.waitForFunction(() => window.imageEditsApplied);
    };
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.waitForSelector('[data-id]');
    await page.locator('#credits').click();
    await page.waitForFunction(() =>
      document
        .querySelector('#credits-dialog pre')
        .textContent.includes('GNU Affero General Public License')
    );
    await page.locator('#credits-dialog button').click();
    const count = await page.locator('#layers .layer').count();
    await app.evaluate(
      ({ clipboard, nativeImage, ClipboardItem }, source) =>
        clipboard.write([
          new ClipboardItem({
            'image/png': new Blob([nativeImage.createFromDataURL(source).toPNG()], {
              type: 'image/png'
            })
          })
        ]),
      fixtureSource
    );
    await page.locator('#stage').focus();
    await page.keyboard.press('Control+v');
    await page.waitForFunction(
      (n) => document.querySelectorAll('#layers .layer').length === n + 1,
      count
    );
    assert.equal(
      await page.locator('#canvas image').count(),
      1,
      'Native clipboard image pastes into document'
    );
    await page.keyboard.press('Control+c');
    await page.waitForFunction(() =>
      document.querySelector('#toast').textContent.startsWith('Image copied')
    );
    const clipboardSize = await app.evaluate(async ({ clipboard, nativeImage }) => {
      const item = (await clipboard.read()).find((item) => item.types.includes('image/png'));
      const blob = await item.getType('image/png');
      return nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer())).getSize();
    });
    assert.deepEqual(clipboardSize, { width: 200, height: 160 });
    const clipboardText = await app.evaluate(({ clipboard }) => clipboard.readText());
    assert.ok(
      clipboardText.startsWith('SKETCHROOM_OBJECTS\n'),
      'Native image and editable internal representation both copy'
    );
    await page.keyboard.press('Control+v');
    await page.waitForFunction(
      (n) => document.querySelectorAll('#layers .layer').length === n + 2,
      count
    );
    await page.locator('[data-action="edit-image"]').click();
    await page.waitForFunction(() =>
      document.querySelector('#image-status').textContent.includes('Drag to crop')
    );
    await page.locator('[data-crop="w"]').fill('50');
    await page.locator('[data-crop="w"]').press('Tab');
    await page.locator('[data-crop="x"]').fill('25');
    await page.locator('[data-crop="x"]').press('Tab');
    await applyImageEdits();
    await page.waitForFunction(() => document.querySelector('[data-prop="w"]')?.value === '100');
    assert.equal(await page.locator('[data-prop="w"]').inputValue(), '100');
    await page.locator('#undo').click();
    await page.locator('#layers .layer').first().click();
    assert.equal(await page.locator('[data-prop="w"]').inputValue(), '200');
    await page.locator('#redo').click();
    await page.locator('#layers .layer').first().click();
    assert.equal(await page.locator('[data-prop="w"]').inputValue(), '100');
    await page.locator('[data-action="edit-image"]').click();
    await page.waitForFunction(() =>
      document.querySelector('#image-status').textContent.includes('Drag to crop')
    );
    await page.locator('#remove-plain').click();
    await page.waitForFunction(() =>
      document.querySelector('#image-status').textContent.startsWith('Preview ready')
    );
    await page.screenshot({ path: path.join(artifacts, 'image-color-preview.png') });
    await applyImageEdits();
    // A previous copy toast must not satisfy the new asynchronous copy wait.
    await page.evaluate(() => {
      document.querySelector('#toast').textContent = '';
    });
    await page.locator('[data-action="copy-image"]').click();
    await page.waitForFunction(() =>
      document.querySelector('#toast').textContent.startsWith('Image copied')
    );
    const removed = await app.evaluate(async ({ clipboard, nativeImage }) => {
      const item = (await clipboard.read()).find((item) => item.types.includes('image/png'));
      const blob = await item.getType('image/png');
      const image = nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer())),
        buffer = image.toBitmap();
      return {
        size: image.getSize(),
        alpha: buffer[3],
        foregroundAlpha: buffer[(60 * image.getSize().width + 50) * 4 + 3]
      };
    });
    assert.deepEqual(removed.size, { width: 100, height: 160 });
    assert.equal(removed.alpha, 0);
    assert.equal(removed.foregroundAlpha, 255);
    await page.locator('#image-input').setInputFiles({
      name: 'plant.png',
      mimeType: 'image/png',
      buffer: await sharp(path.join(root, 'src', 'tests', 'fixtures', 'plant.svg'))
        .png()
        .toBuffer()
    });
    await page.waitForFunction(
      (n) => document.querySelectorAll('#layers .layer').length === n + 3,
      count
    );
    await page.locator('[data-action="edit-image"]').click();
    await page.waitForFunction(() =>
      document.querySelector('#image-status').textContent.includes('Drag to crop')
    );
    await page.locator('#remove-auto').click();
    await page.locator('#cancel-cutout').click();
    await page.waitForFunction(() => !document.querySelector('#remove-auto').disabled, null, {
      timeout: 20000
    });
    await page.locator('#remove-auto').click();
    await page.waitForFunction(
      () =>
        /Local cutout ready|did not finish/.test(
          document.querySelector('#image-status').textContent
        ),
      null,
      { timeout: 90000 }
    );
    const cutoutStatus = await page.locator('#image-status').textContent();
    assert.ok(cutoutStatus.startsWith('Local cutout ready'), cutoutStatus);
    await page.screenshot({ path: path.join(artifacts, 'image-ai-preview.png') });
    await applyImageEdits();
    const prepareDownload = async (destination) => {
      await app.evaluate(({ BrowserWindow }, output) => {
        globalThis.imageDownload = new Promise((resolve) =>
          BrowserWindow.getAllWindows()[0].webContents.session.once(
            'will-download',
            (event, item) => {
              item.setSavePath(output);
              item.once('done', (event, state) => resolve(state));
            }
          )
        );
      }, destination);
    };
    const projectPath = path.join(artifacts, 'images-roundtrip.sketchui');
    await app.evaluate(({ dialog }, destination) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination });
    }, projectPath);
    await page.locator('#save-project').click();
    await page.waitForFunction(() =>
      document.querySelector('#save-state').textContent.startsWith('✓')
    );
    const document = JSON.parse(await fs.readFile(projectPath, 'utf8'));
    const images = document.pages[0].objects.filter((o) => o.type === 'image');
    assert.equal(images.length, 3);
    assert.equal(images[1].crop.w, 0.5);
    assert.ok(images[1].originalSrc);
    assert.ok(images[2].originalSrc);
    await page.locator('#file-input').setInputFiles(projectPath);
    await page.waitForFunction(() =>
      document.querySelector('#save-state').textContent.startsWith('✓')
    );
    assert.equal(await page.locator('#canvas image').count(), 3);
    await page.locator('#export').click();
    await prepareDownload(path.join(artifacts, 'images-export.png'));
    await page.getByRole('button', { name: 'Download PNG' }).click();
    assert.equal(await app.evaluate(() => globalThis.imageDownload), 'completed');
    const exportStats = await fs.stat(path.join(artifacts, 'images-export.png'));
    assert.ok(exportStats.size > 10000);
    await page.screenshot({ path: path.join(artifacts, 'editor-isekai-images.png') });
    assert.deepEqual(errors, []);
    console.log(
      'Image suite passed: real native image paste/copy, editable paste, nondestructive crop, color-removal alpha, local automatic cutout, self-contained project round-trip, PNG export, no renderer errors.'
    );
  } catch (error) {
    await app.windows()[0]?.screenshot({ path: path.join(artifacts, 'image-failure.png') });
    throw error;
  } finally {
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
