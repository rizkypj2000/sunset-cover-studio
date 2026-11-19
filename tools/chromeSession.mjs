// Headless Chrome over the DevTools protocol with Node's own fetch and WebSocket (no packages): launch a browser
// with a throwaway profile, open pages, send commands and listen for events. Used by captureShots.mjs and
// editorSmokeTest.mjs.

import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

export const DEFAULT_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Starts headless Chrome and waits for its DevTools endpoint. Returns { port, stop }. */
export async function launchChrome({ chromePath = DEFAULT_CHROME, profileDir, port = 9333 }) {
  const chrome = spawn(chromePath, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--disable-extensions', '--disable-background-networking', '--disable-component-update', 'about:blank',
  ], { stdio: 'ignore' });
  const stop = async () => {
    chrome.kill();
    await sleep(600);
    rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return { port, stop };
    } catch {}
    await sleep(100);
  }
  await stop();
  throw new Error('Chrome did not open its DevTools port');
}

/** A session on the browser itself (not a page), for browser-wide settings such as where downloads go. */
export async function openBrowserSession(port) {
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  return connectSession(version.webSocketDebuggerUrl, async () => {});
}

/** Opens a new page and returns { send(method, params), on(method, fn), close() } over its WebSocket. */
export async function openPage(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  return connectSession(target.webSocketDebuggerUrl, async () => {
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
  });
}

/** Connects a DevTools WebSocket and wraps it as { send, on, close }. */
async function connectSession(url, onClose) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners.get(msg.method) ?? []) fn(msg.params);
    }
  });
  return {
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    }),
    on(method, fn) {
      if (!listeners.has(method)) listeners.set(method, []);
      listeners.get(method).push(fn);
    },
    async close() {
      ws.close();
      await onClose();
    },
  };
}

/** Evaluates an expression in the page and returns its value. */
export async function evaluate(page, expression) {
  const r = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}

/** Polls an expression until it is truthy. */
export async function waitFor(page, expression, timeoutMs = 20000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await evaluate(page, expression)) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}
