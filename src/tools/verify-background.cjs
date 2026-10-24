const { Worker } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require('sharp');

(async () => {
  const root = path.resolve(__dirname, '..', '..');
  const source = await sharp(path.join(root, 'src', 'tests', 'fixtures', 'plant.svg')).png().toBuffer();
  const worker = new Worker(path.join(root, 'src', 'desktop', 'background-worker.cjs'), { workerData: { source: `data:image/png;base64,${source.toString('base64')}` } });
  const timer = setTimeout(() => { worker.terminate(); throw new Error('Model verification timed out'); }, 120000);
  try {
    const result = await new Promise((resolve, reject) => {
      worker.on('message', message => { if (message.source) resolve(message.source); if (message.error) reject(new Error(message.error)); });
      worker.on('error', reject);
    });
    const png = Buffer.from(result.split(',')[1], 'base64');
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0, opaque = 0;
    for (let i = 3; i < data.length; i += 4) { if (data[i] < 30) transparent++; if (data[i] > 225) opaque++; }
    assert.equal(info.width, 736); assert.equal(info.height, 552);
    assert.ok(transparent > 100 && opaque > 100, 'Cutout contains both removed background and retained subject');
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true }); fs.writeFileSync(path.join(root, 'artifacts', 'local-cutout.png'), png);
    console.log(`Offline model passed: ${info.width} × ${info.height}, ${transparent} transparent pixels, ${opaque} opaque pixels.`);
  } finally { clearTimeout(timer); await worker.terminate(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
