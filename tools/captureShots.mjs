// Takes the screenshots listed in shots.json with headless Chrome over the DevTools protocol (./chromeSession.mjs).
// Serve app/ first (`node serve.ts`), then:
//   node tools/captureShots.mjs [--port 8080] [--chrome <path>] [--only <name>]
// Each shot is a JPEG at the listed viewport size, its quality lowered until the file fits in 256 KiB.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CHROME, launchChrome, openPage, sleep, waitFor } from './chromeSession.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const appPort = Number(option('--port', '8080'));
const only = option('--only', null);
const MAX_BYTES = 256 * 1024;

/** Loads one shot's page at its viewport size, waits for window.__shotReady and saves a JPEG under 256 KiB. */
async function captureShot(port, shot) {
  const page = await openPage(port);
  try {
    await page.send('Emulation.setDeviceMetricsOverride', { width: shot.w, height: shot.h, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.enable');
    await page.send('Page.navigate', { url: `http://localhost:${appPort}/${shot.query}` });
    await waitFor(page, 'window.__shotReady === true');
    await sleep(250);
    for (let quality = 92; quality >= 40; quality -= 4) {
      const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality });
      const bytes = Buffer.from(data, 'base64');
      if (bytes.length <= MAX_BYTES) {
        writeFileSync(join(root, 'screenshots', shot.name), bytes);
        console.log(`${shot.name}: ${shot.w}x${shot.h}, quality ${quality}, ${(bytes.length / 1024).toFixed(1)} KiB`);
        return;
      }
    }
    throw new Error(`${shot.name}: could not fit in 256 KiB`);
  } finally {
    await page.close();
  }
}

const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8')).filter((s) => !only || s.name === only);
mkdirSync(join(root, 'screenshots'), { recursive: true });
const chrome = await launchChrome({ chromePath: option('--chrome', DEFAULT_CHROME), profileDir: join(root, '.chrome-shots') });
try {
  for (const shot of shots) await captureShot(chrome.port, shot);
} finally {
  await chrome.stop();
}
