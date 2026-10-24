// Runs one subject-extraction request off the main thread using bundled local assets.
// Input is an embedded PNG; parentPort returns progress, a PNG result, or an error.
const { parentPort, workerData } = require('node:worker_threads');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const { removeBackground } = require('@imgly/background-removal-node');
  const assetDirectory = path.dirname(require.resolve('@imgly/background-removal-node'));
  const source = new Blob([Buffer.from(workerData.source.split(',')[1], 'base64')], {
    type: 'image/png'
  });
  const result = await removeBackground(source, {
    publicPath: pathToFileURL(assetDirectory + path.sep).href,
    model: 'medium',
    output: { format: 'image/png' },
    progress: (key) => {
      parentPort.postMessage({
        progress: key.startsWith('compute:') ? 'Finding the subject…' : 'Loading the local model…'
      });
    }
  });
  parentPort.postMessage({
    source: `data:image/png;base64,${Buffer.from(await result.arrayBuffer()).toString('base64')}`
  });
})().catch((error) => parentPort.postMessage({ error: error.message }));
