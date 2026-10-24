// Defines the renderer-facing desktop bridge. Methods forward requests to main.cjs;
// event subscriptions deliver download completion and local cutout progress.
const { contextBridge, ipcRenderer } = require('electron');

// Return explicit cleanup so future views can release their event subscriptions.
/**
 * @param {string} channel
 * @param {(value: unknown) => void} callback
 * @returns {() => void} Idempotent listener cleanup.
 */
function subscribe(channel, callback) {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('desktop', {
  saveProject: (content, saveAs) => ipcRenderer.invoke('save-project', content, saveAs),
  openProject: () => ipcRenderer.invoke('open-project'),
  acceptProject: () => ipcRenderer.invoke('accept-project'),
  resetProject: () => ipcRenderer.invoke('reset-project'),
  setDirty: (value) => ipcRenderer.send('dirty-state', Boolean(value)),
  onDownload: (callback) => subscribe('download-result', callback),
  copyImage: (source, text) => ipcRenderer.invoke('copy-image', source, text),
  readCredits: () => ipcRenderer.invoke('read-credits'),
  removeBackground: (source) => ipcRenderer.invoke('remove-image-background', source),
  cancelBackground: () => ipcRenderer.invoke('cancel-image-background'),
  onBackgroundProgress: (callback) => subscribe('background-progress', callback)
});
