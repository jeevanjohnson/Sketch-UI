// Owns the desktop window, native file paths, clipboard, and cutout worker lifecycle.
// The sandboxed renderer calls these operations through preload.cjs; project writes
// use a temporary sibling file so failed writes preserve the active document.
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  clipboard,
  nativeImage,
  ClipboardItem
} = require('electron');
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');

const MAX_PROJECT_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_SOURCE_LENGTH = 32000000;

/** @param {unknown} source @returns {boolean} */
function isPngSource(source) {
  return (
    typeof source === 'string' &&
    source.length <= MAX_IMAGE_SOURCE_LENGTH &&
    source.startsWith('data:image/png;base64,')
  );
}

app.setName('SketchUI');

let mainWindow;
let dirty = false;
let projectPath = null;
let pendingOpen = null;
let backgroundJob = null;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1100,
    minHeight: 720,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#192c58',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.session.on('will-download', (event, item) => {
    const filename = item.getFilename();
    item.once('done', (event, state) => {
      if (!mainWindow.isDestroyed())
        mainWindow.webContents.send('download-result', { filename, state });
    });
  });
  mainWindow.on('close', (event) => {
    if (!dirty) return;
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      title: 'Unsaved sketch',
      message: 'Close without saving your project?',
      detail: 'Save your project before closing to keep your changes.',
      buttons: ['Keep editing', 'Close without saving'],
      defaultId: 0,
      cancelId: 0
    });
    if (choice === 0) event.preventDefault();
  });
});

ipcMain.on('dirty-state', (event, value) => {
  if (event.sender === mainWindow?.webContents) dirty = Boolean(value);
});

function validSender(event) {
  return event.sender === mainWindow?.webContents;
}

ipcMain.handle('read-credits', async (event) => {
  if (!validSender(event)) throw new Error('Unavailable.');
  const license = path.join(
    path.dirname(require.resolve('@imgly/background-removal-node')),
    '..',
    'LICENSE.md'
  );
  const [notices, text] = await Promise.all([
    fs.readFile(path.join(__dirname, '..', 'THIRD_PARTY_NOTICES.md'), 'utf8'),
    fs.readFile(license, 'utf8')
  ]);
  return `${notices}\n\n${text}`;
});

ipcMain.handle('copy-image', async (event, source, text) => {
  if (!validSender(event) || !isPngSource(source)) throw new Error('Invalid image.');
  const image = nativeImage.createFromDataURL(source);
  if (image.isEmpty()) throw new Error('The image is empty.');
  const payload = { 'image/png': new Blob([image.toPNG()], { type: 'image/png' }) };
  if (typeof text === 'string' && text.startsWith('SKETCHROOM_OBJECTS\n') && text.length < 32000000)
    payload['text/plain'] = text;
  await clipboard.write([new ClipboardItem(payload)]);
  return true;
});

ipcMain.handle('remove-image-background', (event, source) => {
  if (!validSender(event) || !isPngSource(source)) throw new Error('Invalid image.');
  if (backgroundJob) throw new Error('Another cutout is already running.');
  const dimensions = nativeImage.createFromDataURL(source).getSize();
  if (
    !dimensions.width ||
    dimensions.width > 4096 ||
    dimensions.height > 4096 ||
    dimensions.width * dimensions.height > 12000000
  )
    throw new Error('Use an image up to 4096 pixels and 12 megapixels.');
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'background-worker.cjs'), {
      workerData: { source }
    });
    backgroundJob = worker;
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      backgroundJob = null;
      clearTimeout(timer);
      worker.terminate();
      if (error) reject(new Error(error));
      else resolve(result);
    };
    const timer = setTimeout(() => finish('The cutout timed out. Try a smaller image.'), 180000);
    worker.on('message', (message) => {
      if (message.progress && !mainWindow.isDestroyed())
        event.sender.send('background-progress', message.progress);
      if (message.source) finish(null, message.source);
      if (message.error) finish(message.error);
    });
    worker.on('error', (error) => finish(error.message));
    worker.on('exit', () => {
      if (!settled) finish('Cutout canceled.');
    });
  });
});
ipcMain.handle('cancel-image-background', (event) => {
  if (validSender(event)) backgroundJob?.terminate();
});
app.on('before-quit', () => backgroundJob?.terminate());
app.on('window-all-closed', () => app.quit());

// Paths remain in the main process, selected through native dialogs.
ipcMain.handle('open-project', async (event) => {
  if (!validSender(event)) throw new Error('Unavailable.');
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: path.join(app.getPath('documents'), 'SketchUI'),
    filters: [{ name: 'SketchUI project', extensions: ['sketchui', 'sketchroom'] }],
    properties: ['openFile']
  });
  if (result.canceled) return null;
  const file = result.filePaths[0];
  if ((await fs.stat(file)).size > MAX_PROJECT_BYTES)
    throw new Error('Choose a project smaller than 100 MB.');
  const content = await fs.readFile(file, 'utf8');
  pendingOpen = file;
  return content;
});
ipcMain.handle('accept-project', (event) => {
  if (!validSender(event) || !pendingOpen) throw new Error('No project to open.');
  projectPath = pendingOpen;
  pendingOpen = null;
});
ipcMain.handle('reset-project', (event) => {
  if (validSender(event)) {
    projectPath = null;
    pendingOpen = null;
  }
});
ipcMain.handle('save-project', async (event, content, saveAs) => {
  if (
    !validSender(event) ||
    typeof content !== 'string' ||
    Buffer.byteLength(content) > MAX_PROJECT_BYTES
  )
    throw new Error('Project exceeds 100 MB.');
  const project = JSON.parse(content);
  if (!project || project.format !== 'sketchroom') throw new Error('Invalid project.');
  let destination = projectPath;
  if (!destination || saveAs) {
    const name =
      String(project.name || 'Untitled project')
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        .replace(/[. ]+$/g, '')
        .slice(0, 100) || 'Untitled project';
    const safeName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ? '_' + name : name;
    const folder = path.join(app.getPath('documents'), 'SketchUI', safeName);
    await fs.mkdir(folder, { recursive: true });
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: path.join(folder, safeName + '.sketchui'),
      filters: [{ name: 'SketchUI project', extensions: ['sketchui'] }]
    });
    if (result.canceled) return null;
    destination = result.filePath;
  }
  const temporary = destination + '.' + randomUUID() + '.tmp';
  try {
    await fs.writeFile(temporary, content, { flag: 'wx' });
    await fs.rename(temporary, destination);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
  projectPath = destination;
  return { path: destination };
});
