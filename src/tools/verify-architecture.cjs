const { _electron: electron } = require('@playwright/test');
const path = require('node:path');
(async () => {
  const root = path.resolve(__dirname, '..', '..');
  const app = await electron.launch({ args: [root], executablePath: require('electron') });
  try {
    const page = await app.firstWindow();
    await app.evaluate(
      ({ BrowserWindow }, file) => BrowserWindow.getAllWindows()[0].loadFile(file),
      path.join(root, 'architecture', 'index.html')
    );
    await page.getByRole('button', { name: 'Electron main process', exact: false }).click();
    if (!(await page.locator('#details').textContent()).includes('temporary'))
      throw Error('Details missing');
    await page.locator('#search').fill('worker');
    if ((await page.locator('#nodes button').count()) < 1) throw Error('Filter failed');
    await page.locator('#search').fill('');
    await page.getByRole('button', { name: 'Highlight Save path' }).click();
    await page.screenshot({ path: path.join(root, 'artifacts', 'architecture.png') });
    console.log('Architecture navigation, filtering and Save trace passed.');
  } finally {
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().forEach((window) => window.destroy())
    );
    await app.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
