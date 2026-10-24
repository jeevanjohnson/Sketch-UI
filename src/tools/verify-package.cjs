const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const asar = require('@electron/asar');
const root = path.resolve(__dirname, '..', '..');
const archive = path.join(root, 'releases', 'win-unpacked', 'resources', 'app.asar');
function files(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const file = path.posix.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
const runtime = fs
  .readdirSync(path.join(root, 'src'))
  .filter((file) => /\.(html|css|mjs)$/.test(file))
  .map((file) => 'src/' + file);
runtime.push(
  ...files('src/desktop'),
  ...files('src/assets'),
  'src/THIRD_PARTY_NOTICES.md',
  'LICENSE'
);
for (const file of runtime)
  assert.ok(
    asar.extractFile(archive, path.normalize(file)).equals(fs.readFileSync(path.join(root, file))),
    'Packaged input mismatch: ' + file
  );
const source = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
const packaged = JSON.parse(asar.extractFile(archive, 'package.json'));
for (const key of ['name', 'version', 'main', 'license', 'productName'])
  assert.equal(packaged[key], source[key], key);
assert.deepEqual(packaged.dependencies, source.dependencies);
assert.ok(
  !asar.listPackage(archive).some((file) => /^[/\\]src[/\\](tests|tools)[/\\]/.test(file)),
  'Development files must be excluded'
);
// A cross-architecture build can otherwise package only the host's Sharp binary.
const sharpVersion = source.overrides.sharp;
const sharpBinary = path.join(
  root,
  'releases',
  'win-unpacked',
  'resources',
  'app.asar.unpacked',
  'node_modules',
  '@img',
  'sharp-win32-x64',
  'lib',
  `sharp-win32-x64-${sharpVersion}.node`
);
const nativeBytes = fs.readFileSync(sharpBinary);
const peOffset = nativeBytes.readUInt32LE(0x3c);
assert.equal(nativeBytes.toString('ascii', peOffset, peOffset + 4), 'PE\0\0');
assert.equal(nativeBytes.readUInt16LE(peOffset + 4), 0x8664, 'Sharp must target Windows x64');
console.log(
  'Packaged source matches all ' +
    runtime.length +
    ' runtime/license assets; identity and dependencies match; x64 Sharp binary verified; development files excluded.'
);
