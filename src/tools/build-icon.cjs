const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
(async () => {
  const assets = path.join(__dirname, '..', 'assets');
  const png = await sharp(path.join(assets, 'icon.svg')).resize(256, 256).png().toBuffer();
  fs.writeFileSync(path.join(assets, 'icon.png'), png);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  fs.writeFileSync(path.join(assets, 'icon.ico'), Buffer.concat([header, png]));
})();
