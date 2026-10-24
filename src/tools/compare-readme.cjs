const fs = require('node:fs');
const [beforeFile, afterFile, outputFile] = process.argv.slice(2);
if (!beforeFile || !afterFile || !outputFile)
  throw new Error('Usage: node compare-readme.cjs before.md after.md comparison.md');
const before = fs.readFileSync(beforeFile, 'utf8').split(/\r?\n/);
const after = fs.readFileSync(afterFile, 'utf8').split(/\r?\n/);
const lengths = Array.from({ length: before.length + 1 }, () => Array(after.length + 1).fill(0));
for (let i = before.length - 1; i >= 0; i--) {
  for (let j = after.length - 1; j >= 0; j--) {
    lengths[i][j] =
      before[i] === after[j]
        ? 1 + lengths[i + 1][j + 1]
        : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  }
}
const escape = (line) => line.replace(/[\\*~_`<>\[\]#!]/g, '\\$&');
const lines = [];
let i = 0,
  j = 0;
while (i < before.length || j < after.length) {
  if (i < before.length && j < after.length && before[i] === after[j]) {
    lines.push(escape(before[i]));
    i++;
    j++;
  } else if (j < after.length && (i === before.length || lengths[i][j + 1] >= lengths[i + 1][j])) {
    lines.push(after[j] ? '**' + escape(after[j]) + '**' : '');
    j++;
  } else {
    lines.push(before[i] ? '~~' + escape(before[i]) + '~~' : '');
    i++;
  }
}
fs.writeFileSync(
  outputFile,
  '# README comparison\n\nClean copy: [README.md](../README.md). Removed lines are struck out; additions are bold. Compared with the README saved immediately before release preparation.\n\n' +
    lines.join('\n\n') +
    '\n'
);
