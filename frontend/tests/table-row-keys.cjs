// Isolated rendered regression: no Java, real snapshots, or scheduler registration.
const { app, BrowserWindow, ipcMain } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'onion-row-keys-'));
app.setPath('userData', profile);
const duplicates = ['Siri', 'OnionManager', 'org.eclipse', 'NativeMessagingHost'].flatMap(name => [
  { name, version: '1.0', path: `/Applications/${name}.app` },
  { name, version: '1.0', path: `/Other/${name}.app` },
]);
const game = { name: 'HonkaiImpact3rd', version: '9.0.0', path: '/Applications/Game.app' };
let snapshot = { schemaVersion: 1, collectedAt: '2026-09-29T12:00:00Z', config: {
  hardware: {}, firmware: {}, os: {},
  libraries: [{ name: 'Parser', version: '1' }, { name: 'Parser', version: '1' }, { name: 'Other', version: '2' }],
  applications: [...duplicates, game],
} };
ipcMain.handle('test:read-snapshot', () => ({ status: 'found', snapshot }));
const watchdog = setTimeout(() => { console.error('Table UI regression timed out'); app.exit(1); }, 30000);
app.on('will-quit', () => clearTimeout(watchdog));
app.on('quit', () => fs.rmSync(profile, { recursive: true, force: true }));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: true, width: 1100, height: 760,
    webPreferences: { preload: path.join(__dirname, 'table-row-keys-preload.cjs') } });
  const warnings = [];
  win.webContents.on('console-message', ({ message }) => {
    if (/same key|unique.*key/i.test(message)) warnings.push(message);
  });
  const js = code => win.webContents.executeJavaScript(code, true);
  const wait = () => new Promise(resolve => setTimeout(resolve, 100));
  const section = `document.querySelector('[aria-labelledby="inventory-heading"]')`;
  async function query(value) {
    await js(`{ const input = ${section}.querySelector('input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true })); }`);
    await wait();
  }
  async function rows(layerIndex) {
    return js(`[...${section}.querySelectorAll('.MuiAccordion-root')[${layerIndex}].querySelectorAll('.library-table-name')].map(row => row.textContent)`);
  }
  await win.loadFile(path.resolve(__dirname, '../dist/index.html'));
  for (let attempt = 0; attempt < 50; attempt++) {
    if ((await rows(4)).length === 9) break;
    await wait();
  }
  assert.equal((await rows(4)).length, 9);
  for (let repetition = 0; repetition < 3; repetition++) {
    for (const [term, expected] of [['honkai', ['HonkaiImpact3rd']], ['siri', ['Siri', 'Siri']],
      ['native', ['NativeMessagingHost', 'NativeMessagingHost']], ['missing', []]]) {
      await query(term);
      assert.deepEqual(await rows(4), expected);
      assert.match(await js(`${section}.querySelectorAll('.MuiAccordionSummary-root')[4].textContent`), new RegExp(`${expected.length} matching`));
    }
    await query('');
    assert.equal((await rows(4)).length, 9);
  }
  await query('honkai');
  snapshot = { ...snapshot, collectedAt: '2026-09-29T12:01:00Z', config: { ...snapshot.config,
    applications: [...duplicates].reverse().concat({ ...game, version: '9.1.0' }) } };
  await js(`window.dispatchEvent(new Event('focus'))`); await wait();
  assert.deepEqual(await rows(4), ['HonkaiImpact3rd']);
  assert.match(await js(`${section}.querySelectorAll('.MuiAccordion-root')[4].textContent`), /9\.1\.0/);
  await query('');
  assert.equal((await rows(4)).length, 9);
  for (const term of ['parser', '', 'other', 'parser']) {
    await query(term);
    const expected = term === 'parser' ? ['Parser', 'Parser'] : term === 'other' ? ['Other'] : ['Parser', 'Parser', 'Other'];
    assert.deepEqual(await rows(3), expected);
  }
  assert.deepEqual(warnings, []);
  console.log('Rendered regression passed: duplicate apps/libraries, repeated filtering, counts, clearing, and snapshot refresh.');
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
