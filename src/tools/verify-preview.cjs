const { spawn } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, 'serve.cjs')], { stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      server.stdout.once('data', resolve);
      server.once('error', reject);
      server.once('exit', code => reject(new Error('Preview exited: ' + code)));
    });
    for (const [file, type] of [['/', 'text/html'], ['/app.mjs', 'text/javascript'], ['/assets/icon.svg', 'image/svg+xml']]) {
      const response = await fetch('http://127.0.0.1:5173' + file);
      assert.equal(response.status, 200, file);
      assert.ok(response.headers.get('content-type').includes(type), file);
      assert.ok((await response.text()).length > 0, file);
    }
    assert.equal((await fetch('http://127.0.0.1:5173/package.json')).status, 404);
    console.log('Preview passed: relocated HTML, module and favicon; non-public files denied.');
  } finally { server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
