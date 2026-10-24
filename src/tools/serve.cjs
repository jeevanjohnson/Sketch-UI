const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const allowed = new Set([
  'index.html',
  'styles.css',
  'theme.css',
  'app.mjs',
  'object-renderer.mjs',
  'model.mjs',
  'text-layout.mjs',
  'image-editor.mjs',
  'image-processing.mjs',
  'image-worker.mjs',
  'assets/icon.svg'
]);
const types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.mjs': 'text/javascript',
  '.svg': 'image/svg+xml'
};
http
  .createServer((request, response) => {
    const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (!allowed.has(name)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    response.setHeader('Content-Type', types[path.extname(name)]);
    fs.createReadStream(path.join(root, name)).pipe(response);
  })
  .listen(5173, '127.0.0.1', () => console.log('SketchUI: http://127.0.0.1:5173'));
