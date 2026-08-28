#!/usr/bin/env node
/**
 * Drive the isolated Traces Electron renderer over Chrome DevTools Protocol.
 *
 * Usage (after sourcing the launch run.env):
 *   node helpers/drive.mjs ready
 *   node helpers/drive.mjs doctor-json
 *   node helpers/drive.mjs eval --js 'document.title'
 *   node helpers/drive.mjs click --title "New Note"
 *   node helpers/drive.mjs click --name "Galaxy View"
 *   node helpers/drive.mjs click --text "Verify Alpha"
 *   node helpers/drive.mjs click --placeholder "Search..."
 *   node helpers/drive.mjs click --selector ".cm-content"
 *   node helpers/drive.mjs fill --placeholder "Note name..." --value "Verify Gamma"
 *   node helpers/drive.mjs fill --placeholder "Search..." --value "alpha"
 *   node helpers/drive.mjs press --key Enter
 *   node helpers/drive.mjs shortcut --key n
 *   node helpers/drive.mjs shortcut --key f
 *   node helpers/drive.mjs type --text "body text"
 *   node helpers/drive.mjs wait-text --text "Verify Gamma"
 *   node helpers/drive.mjs screenshot --path "$TRACES_VERIFY_EVIDENCE/notes.png"
 *   node helpers/drive.mjs snapshot --path "$TRACES_VERIFY_EVIDENCE/notes.json"
 *   node helpers/drive.mjs vault-path
 *   node helpers/drive.mjs read-vault --rel "Verify Gamma.md"
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const helpersDir = dirname(fileURLToPath(import.meta.url));

function fail(message) {
  console.error(`verify-traces drive: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const command = argv[0];
  const flags = {};
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) flags[key] = true;
      else {
        flags[key] = next;
        i += 1;
      }
    }
  }
  return { command, flags };
}

function loadState() {
  const runDir = process.env.TRACES_VERIFY_RUN;
  if (!runDir) return null;
  const statePath = join(runDir, 'state.json');
  if (!existsSync(statePath)) return null;
  return JSON.parse(readFileSync(statePath, 'utf8'));
}

function cdpPort() {
  if (process.env.TRACES_VERIFY_CDP_PORT) return Number(process.env.TRACES_VERIFY_CDP_PORT);
  const state = loadState();
  if (state?.cdpPort) return Number(state.cdpPort);
  return 9333;
}

async function cdpList(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) throw new Error(`CDP /json/list -> ${response.status}`);
  return response.json();
}

async function pickRenderer(port) {
  const targets = await cdpList(port);
  const pages = targets.filter(
    (target) =>
      target.type === 'page' &&
      typeof target.url === 'string' &&
      /https?:\/\/(localhost|127\.0\.0\.1):3333/.test(target.url)
  );
  if (pages.length === 0) {
    throw new Error(
      `no renderer page on localhost:3333. targets=${JSON.stringify(
        targets.map((target) => ({ type: target.type, url: target.url }))
      )}`
    );
  }
  return pages[0];
}

class CdpSession {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
  }

  async ready() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', (event) => reject(event.error || event), { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      }
    });
    await this.send('Runtime.enable');
    await this.send('Page.enable');
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 20000);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, awaitPromise = false) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) {
      const text =
        result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        JSON.stringify(result.exceptionDetails);
      throw new Error(text);
    }
    return result.result?.value;
  }

  close() {
    this.ws.close();
  }
}

async function withSession(fn) {
  const port = cdpPort();
  const target = await pickRenderer(port);
  const session = new CdpSession(target.webSocketDebuggerUrl);
  await session.ready();
  try {
    return await fn(session, target);
  } finally {
    session.close();
  }
}

const SNAPSHOT_JS = `(() => {
  const buttons = [...document.querySelectorAll('button')].map((button) => ({
    title: button.getAttribute('title'),
    ariaLabel: button.getAttribute('aria-label'),
    pressed: button.getAttribute('aria-pressed'),
    text: (button.innerText || '').trim().slice(0, 80),
  }));
  const inputs = [...document.querySelectorAll('input')].map((input) => ({
    placeholder: input.placeholder,
    value: input.value,
    type: input.type,
  }));
  const canvases = document.querySelectorAll('canvas').length;
  const cm = Boolean(document.querySelector('.cm-content'));
  const editorTheme = document.querySelector('[data-editor-theme]')?.getAttribute('data-editor-theme') || null;
  const body = (document.body.innerText || '').replace(/\\s+/g, ' ').trim();
  return {
    title: document.title,
    url: location.href,
    theme: document.documentElement.getAttribute('data-theme'),
    hasElectronApi: Boolean(window.electronAPI),
    buttons,
    inputs,
    canvases,
    hasCodeMirror: cm,
    editorTheme,
    text: body.slice(0, 4000),
  };
})()`;

const DOCTOR_JS = `(() => {
  const loading = (document.body.innerText || '').includes('Loading your knowledge graph');
  return {
    title: document.title,
    href: location.href,
    loading,
    hasElectronApi: Boolean(window.electronAPI && typeof window.electronAPI.getVaultPath === 'function'),
    textSample: (document.body.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 240),
  };
})()`;

const FINDER_JS = (flags) => `(() => {
  const title = ${JSON.stringify(flags.title || '')};
  const name = ${JSON.stringify(flags.name || '')};
  const text = ${JSON.stringify(flags.text || '')};
  const placeholder = ${JSON.stringify(flags.placeholder || '')};
  const selector = ${JSON.stringify(flags.selector || '')};
  const aria = ${JSON.stringify(flags['aria-label'] || '')};
  let el = null;
  if (selector) el = document.querySelector(selector);
  if (!el && placeholder) el = document.querySelector('input[placeholder=' + JSON.stringify(placeholder) + ']');
  if (!el && title) el = document.querySelector('[title=' + JSON.stringify(title) + ']');
  if (!el && aria) el = document.querySelector('[aria-label=' + JSON.stringify(aria) + ']');
  if (!el && name) {
    el = [...document.querySelectorAll('[aria-label],[title]')].find((node) => {
      return node.getAttribute('aria-label') === name || node.getAttribute('title') === name;
    }) || null;
  }
  if (!el && text) {
    el = [...document.querySelectorAll('button, [role="button"], span, div')].find((node) => {
      return (node.innerText || '').trim() === text;
    }) || null;
  }
  if (!el) return { found: false };
  el.scrollIntoView({ block: 'center', inline: 'center' });
  const rect = el.getBoundingClientRect();
  return {
    found: true,
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    width: rect.width,
    height: rect.height,
    tag: el.tagName,
    title: el.getAttribute('title'),
    ariaLabel: el.getAttribute('aria-label'),
  };
})()`;

async function clickFlags(session, flags) {
  const found = await session.evaluate(FINDER_JS(flags));
  if (!found?.found) {
    throw new Error(`no element matched ${JSON.stringify(flags)}`);
  }
  await session.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: found.x,
    y: found.y,
    button: 'left',
    clickCount: 1,
  });
  await session.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: found.x,
    y: found.y,
    button: 'left',
    clickCount: 1,
  });
  return found;
}

async function fillInput(session, placeholder, value) {
  const ok = await session.evaluate(`(() => {
    const el = document.querySelector('input[placeholder=' + ${JSON.stringify(JSON.stringify(placeholder))} + ']');
    if (!el) return false;
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!ok) throw new Error(`no input with placeholder ${JSON.stringify(placeholder)}`);
}

async function pressKey(session, key, modifiers = 0) {
  await session.send('Input.dispatchKeyEvent', { type: 'keyDown', key, windowsVirtualKeyCode: keyCode(key), modifiers });
  await session.send('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: keyCode(key), modifiers });
}

function keyCode(key) {
  if (key === 'Enter') return 13;
  if (key === 'Escape') return 27;
  if (key === 'Tab') return 9;
  if (key === 'Backspace') return 8;
  if (key.length === 1) return key.toUpperCase().charCodeAt(0);
  return 0;
}

function writeOutput(path, contents, encoding = 'utf8') {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, encoding);
}

async function waitForReady(session, timeoutMs = 30000) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await session.evaluate(DOCTOR_JS);
    if (last && last.hasElectronApi && last.title === 'Traces' && !last.loading) return last;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`renderer not ready: ${JSON.stringify(last)}`);
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (!command || command === 'help' || command === '--help') {
    console.log(readFileSync(join(helpersDir, 'drive.mjs'), 'utf8').split('*/')[0].replace('#!/usr/bin/env node\n/**\n', ''));
    process.exit(0);
  }

  if (command === 'ready') {
    const info = await withSession((session) => waitForReady(session));
    console.log(JSON.stringify(info, null, 2));
    return;
  }

  if (command === 'doctor-json') {
    const state = loadState();
    const info = await withSession(async (session) => {
      await waitForReady(session);
      const ui = await session.evaluate(DOCTOR_JS);
      const vaultPath = await session.evaluate(
        `window.electronAPI.getVaultPath()`,
        true
      );
      return { ui, vaultPath };
    });
    const report = {
      ...info,
      expectedVault: state?.vaultDir || null,
      vaultMatches: Boolean(state?.vaultDir) && info.vaultPath === state.vaultDir,
      isolatedHome: Boolean(state?.home) && !['/home/ubuntu', process.env.REAL_HOME].includes(state.home),
      nextPort: state?.nextPort || 3333,
      cdpPort: cdpPort(),
    };
    console.log(JSON.stringify(report, null, 2));
    if (!report.ui.hasElectronApi || report.ui.loading || !report.vaultMatches) {
      process.exit(1);
    }
    return;
  }

  if (command === 'eval') {
    if (!flags.js) fail('--js is required');
    const value = await withSession((session) => session.evaluate(flags.js, Boolean(flags.await)));
    console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
    return;
  }

  if (command === 'click') {
    const found = await withSession((session) => clickFlags(session, flags));
    console.log(JSON.stringify(found, null, 2));
    return;
  }

  if (command === 'fill') {
    if (!flags.placeholder || flags.value === undefined) fail('--placeholder and --value are required');
    await withSession((session) => fillInput(session, flags.placeholder, String(flags.value)));
    console.log(`filled ${flags.placeholder}`);
    return;
  }

  if (command === 'press') {
    if (!flags.key) fail('--key is required');
    await withSession((session) => pressKey(session, String(flags.key)));
    console.log(`pressed ${flags.key}`);
    return;
  }

  if (command === 'shortcut') {
    if (!flags.key) fail('--key is required');
    // Electron on Linux uses Control for the AppShell Cmd/Ctrl shortcuts.
    await withSession((session) => pressKey(session, String(flags.key), 2));
    console.log(`shortcut Control+${flags.key}`);
    return;
  }

  if (command === 'type') {
    if (flags.text === undefined) fail('--text is required');
    await withSession(async (session) => {
      if (flags.selector || flags.title || flags.placeholder || flags.name || flags.text === undefined) {
        if (flags.selector || flags.title || flags.placeholder || flags.name) {
          await clickFlags(session, flags);
        }
      }
      if (flags['focus-editor']) {
        const focused = await session.evaluate(`(() => {
          const el = document.querySelector('.cm-content');
          if (!el) return false;
          el.focus();
          return true;
        })()`);
        if (!focused) throw new Error('no .cm-content editor');
      }
      await session.send('Input.insertText', { text: String(flags.text) });
    });
    console.log('typed');
    return;
  }

  if (command === 'wait-text') {
    if (!flags.text) fail('--text is required');
    const timeoutMs = Number(flags.timeout || 15000);
    await withSession(async (session) => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        const body = await session.evaluate(`document.body.innerText`);
        if (typeof body === 'string' && body.includes(flags.text)) return;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error(`timed out waiting for text ${JSON.stringify(flags.text)}`);
    });
    console.log(`saw ${flags.text}`);
    return;
  }

  if (command === 'screenshot') {
    if (!flags.path) fail('--path is required');
    await withSession(async (session) => {
      const result = await session.send('Page.captureScreenshot', { format: 'png' });
      writeOutput(flags.path, Buffer.from(result.data, 'base64'));
    });
    console.log(flags.path);
    return;
  }

  if (command === 'snapshot') {
    if (!flags.path) fail('--path is required');
    const snap = await withSession((session) => session.evaluate(SNAPSHOT_JS));
    writeOutput(flags.path, `${JSON.stringify(snap, null, 2)}\n`);
    console.log(flags.path);
    return;
  }

  if (command === 'vault-path') {
    const path = await withSession((session) => session.evaluate(`window.electronAPI.getVaultPath()`, true));
    console.log(path);
    return;
  }

  if (command === 'read-vault') {
    if (!flags.rel) fail('--rel is required (vault-relative path)');
    const state = loadState();
    if (!state?.vaultDir) fail('no vaultDir in state.json');
    const abs = join(state.vaultDir, flags.rel);
    if (!abs.startsWith(state.vaultDir)) fail('refusing path outside the isolated vault');
    if (!existsSync(abs)) fail(`missing ${abs}`);
    process.stdout.write(readFileSync(abs, 'utf8'));
    return;
  }

  fail(`unknown command: ${command}`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
