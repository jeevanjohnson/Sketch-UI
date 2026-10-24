import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { runInNewContext } from 'node:vm';

test('desktop event subscriptions forward payloads and release only their listener', () => {
  const ipcRenderer = new EventEmitter();
  let bridge;
  runInNewContext(readFileSync(new URL('../desktop/preload.cjs', import.meta.url), 'utf8'), {
    require: () => ({
      ipcRenderer,
      contextBridge: {
        exposeInMainWorld: (_name, value) => {
          bridge = value;
        }
      }
    })
  });
  for (const [method, channel] of [
    ['onDownload', 'download-result'],
    ['onBackgroundProgress', 'background-progress']
  ]) {
    const received = [];
    const unrelated = () => {};
    ipcRenderer.on(channel, unrelated);
    const unsubscribe = bridge[method]((value) => received.push(value));
    const payload = { state: 'completed' };
    ipcRenderer.emit(channel, { sender: 'private' }, payload);
    assert.deepEqual(received, [payload]);
    unsubscribe();
    unsubscribe();
    ipcRenderer.emit(channel, {}, 'later');
    assert.deepEqual(received, [payload]);
    assert.deepEqual(ipcRenderer.listeners(channel), [unrelated]);
  }
});
