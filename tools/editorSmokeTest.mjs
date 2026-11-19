// Drives the editor in headless Chrome the way a person would: picks a photo with the file input, selects and
// drags a panel, zooms with the wheel, types a caption, tries every size and layout, and exports a PNG at each
// size, checking the PNG's dimensions. Serve app/ first (`node serve.ts`), then: node tools/editorSmokeTest.mjs

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluate, launchChrome, openBrowserSession, openPage, sleep, waitFor } from './chromeSession.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const appPort = Number(process.argv.includes('--port') ? process.argv[process.argv.indexOf('--port') + 1] : 8080);
const downloads = join(root, '.smoke-downloads');
const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures.push(label);
};

const previewHash = `(() => { const c = document.getElementById('preview'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let h = 0; for (let i = 0; i < d.length; i += 61) h = (h * 31 + d[i]) | 0; return h; })()`;

/** The PNG's width and height from its IHDR chunk, or null unless it is a whole PNG ending in IEND. */
function pngSize(file) {
  const b = readFileSync(file);
  const whole = b.length > 40 && b.toString('ascii', 1, 4) === 'PNG' && b.toString('ascii', b.length - 8, b.length - 4) === 'IEND';
  return whole ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
}

async function mouse(page, type, x, y, extra = {}) {
  await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
}

async function clickSelector(page, selector) {
  const box = await evaluate(page, `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  await mouse(page, 'mousePressed', box[0], box[1]);
  await mouse(page, 'mouseReleased', box[0], box[1]);
  await sleep(150);
}

rmSync(downloads, { recursive: true, force: true });
mkdirSync(downloads, { recursive: true });
const chrome = await launchChrome({ profileDir: join(root, '.chrome-smoke'), port: 9334 });
const page = await openPage(chrome.port);
const errors = [];
try {
  page.on('Runtime.exceptionThrown', (p) => errors.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text));
  page.on('Runtime.consoleAPICalled', (p) => { if (p.type === 'error') errors.push(p.args.map((a) => a.value ?? a.description).join(' ')); });
  await page.send('Runtime.enable');
  await page.send('Page.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 820, deviceScaleFactor: 1, mobile: false });
  const browser = await openBrowserSession(chrome.port);
  await browser.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  await page.send('Page.navigate', { url: `http://localhost:${appPort}/` });
  await waitFor(page, `document.querySelectorAll('#photoTray button').length === 2`);
  check(true, 'editor opens with the two sample photos');

  const { root: doc } = await page.send('DOM.getDocument');
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: doc.nodeId, selector: '#photoInput' });
  await page.send('DOM.setFileInputFiles', { nodeId, files: [join(root, 'app', 'samples', 'pier.jpg'), join(root, 'app', 'samples', 'boulevard.jpg')] });
  await waitFor(page, `document.getElementById('exportStatus').textContent.includes('added')`);
  check(await evaluate(page, `document.querySelectorAll('#photoTray button').length`) === 2, 'picked photos replace the samples in the tray');

  const box = await evaluate(page, `(() => { const r = document.getElementById('preview').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()`);
  const [px, py, pw, ph] = box;
  // Panel 3 of the landscape mosaic sits at the top right.
  await mouse(page, 'mousePressed', px + pw * 0.85, py + ph * 0.25);
  await mouse(page, 'mouseReleased', px + pw * 0.85, py + ph * 0.25);
  await sleep(100);
  check((await evaluate(page, `document.getElementById('panelNumber').textContent`)).startsWith('3'), 'clicking a panel selects it');

  const before = await evaluate(page, previewHash);
  await mouse(page, 'mousePressed', px + pw * 0.15, py + ph * 0.25);
  for (let i = 1; i <= 8; i++) await mouse(page, 'mouseMoved', px + pw * 0.15 + i * 6, py + ph * 0.25 + i * 3);
  await mouse(page, 'mouseReleased', px + pw * 0.15 + 48, py + ph * 0.25 + 24);
  await sleep(200);
  check((await evaluate(page, previewHash)) !== before, 'dragging a panel pans its photo');

  await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: px + pw * 0.15, y: py + ph * 0.25, deltaX: 0, deltaY: -400 });
  await sleep(200);
  check(Number(await evaluate(page, `document.getElementById('panelZoom').value`)) > 1.3, 'the wheel zooms the panel');

  const nav = await evaluate(page, `(() => { const r = document.getElementById('cropNavigator').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()`);
  const navBefore = await evaluate(page, previewHash);
  await mouse(page, 'mousePressed', nav[0] + nav[2] * 0.3, nav[1] + nav[3] * 0.3);
  await mouse(page, 'mouseMoved', nav[0] + nav[2] * 0.7, nav[1] + nav[3] * 0.7);
  await mouse(page, 'mouseReleased', nav[0] + nav[2] * 0.7, nav[1] + nav[3] * 0.7);
  await sleep(200);
  check((await evaluate(page, previewHash)) !== navBefore, 'dragging the crop navigator moves the crop');

  await clickSelector(page, '#captionTitle');
  await evaluate(page, `(() => { const t = document.getElementById('captionTitle'); t.select(); })()`);
  const typedBefore = await evaluate(page, previewHash);
  await page.send('Input.insertText', { text: 'Night Drive 99!' });
  await sleep(200);
  check((await evaluate(page, previewHash)) !== typedBefore, 'typing the caption redraws the cover');

  for (const [i, size] of [[0, '1920x1080'], [1, '1080x1350'], [2, '1080x1080']]) {
    await clickSelector(page, `#sizePresets button:nth-child(${i + 1})`);
    const layouts = await evaluate(page, `document.querySelectorAll('#layoutPicker button').length`);
    for (let l = 1; l <= layouts; l++) await clickSelector(page, `#layoutPicker button:nth-child(${l})`);
    check(layouts >= 3, `${size} offers ${layouts} layouts`);
    await clickSelector(page, '#exportPng');
    // Headless Chrome may leave a finished download under its .crdownload name, so either name counts once the
    // bytes are a whole PNG.
    const exported = () => readdirSync(downloads).find((f) => f.includes(`${size}.png`) && pngSize(join(downloads, f)));
    const started = Date.now();
    for (let t = 0; t < 100 && !exported(); t++) await sleep(100);
    const file = exported();
    console.log(`     export took ${Date.now() - started} ms`);
    const dims = file && pngSize(join(downloads, file));
    check(dims && `${dims[0]}x${dims[1]}` === size, `export writes ${file ?? 'nothing'} at ${dims ? dims.join('x') : '?'}`);
  }
  for (const id of ['#gradePicker button:nth-child(2)', '#effectToggles button:nth-child(2)', '#backdropPicker button:nth-child(2)', '#letterStylePicker button:nth-child(3)', '#panelFlip', '#panelEverywhere', '#fillPanels']) {
    await clickSelector(page, id);
  }
  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
} finally {
  await page.close();
  await chrome.stop();
  if (existsSync(downloads)) rmSync(downloads, { recursive: true, force: true });
}
console.log(failures.length ? `${failures.length} failed` : 'all passed');
process.exitCode = failures.length ? 1 : 0;
