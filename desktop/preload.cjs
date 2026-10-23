const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  setDirty: value => ipcRenderer.send('dirty-state', Boolean(value)),
  onDownload: callback => ipcRenderer.on('download-result', (event, result) => callback(result)),
  copyImage: (source, text) => ipcRenderer.invoke('copy-image', source, text),
  readCredits: () => ipcRenderer.invoke('read-credits'),
  removeBackground: source => ipcRenderer.invoke('remove-image-background', source),
  cancelBackground: () => ipcRenderer.invoke('cancel-image-background'),
  onBackgroundProgress: callback => ipcRenderer.on('background-progress', (event, text) => callback(text))
});
