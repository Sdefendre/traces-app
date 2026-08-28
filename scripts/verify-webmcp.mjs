/**
 * Exercise marketing WebMCP registration with a fake modelContext.
 * Feature-detect is document.modelContext || navigator.modelContext, then registerTool.
 * Also checks the in-app path helpers and the shared context resolver.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sameJson(actual, expected) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}

function createFakeModelContext() {
  const tools = new Map();
  return {
    tools,
    async registerTool(tool, options = {}) {
      if (options.signal?.aborted) throw options.signal.reason ?? new Error('aborted');
      if (tools.has(tool.name)) throw new Error(`already registered: ${tool.name}`);
      tools.set(tool.name, tool);
      options.signal?.addEventListener('abort', () => {
        tools.delete(tool.name);
      });
    },
    async getTools() {
      return [...tools.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
    async executeTool(registeredTool, input = {}, options = {}) {
      const tool = tools.get(registeredTool.name);
      if (!tool) throw new Error(`missing tool: ${registeredTool.name}`);
      const executeController = new AbortController();
      if (options.signal?.aborted) executeController.abort(options.signal.reason);
      options.signal?.addEventListener('abort', () => {
        executeController.abort(options.signal.reason);
      });
      return tool.execute(input, { signal: executeController.signal });
    },
    ontoolchange: null,
  };
}

function loadMarketingScript(document, extra = {}) {
  const source = readFileSync(path.join(root, 'docs/webmcp.js'), 'utf8');
  const listeners = new Map();
  const window = {
    document,
    addEventListener(type, fn, options) {
      listeners.set(type, { fn, options });
    },
    ...extra.window,
  };
  const context = {
    window,
    document,
    AbortController,
    console,
    setTimeout,
    clearTimeout,
    ...extra.globals,
  };
  vm.runInNewContext(source, context);
  return { window, listeners, context };
}

async function waitForTools(modelContext, count) {
  const started = Date.now();
  while (modelContext.tools.size < count) {
    if (Date.now() - started > 1000) {
      throw new Error(`timed out waiting for ${count} tools, had ${modelContext.tools.size}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

const TOOL_NAME = /^[A-Za-z0-9_.-]{1,128}$/;
const MARKETING_TOOLS = [
  'get-contact',
  'get-github-url',
  'get-install-instructions',
  'get-product-info',
  'jump-to-section',
];

function assertToolNames(names) {
  for (const name of names) {
    assert.match(name, TOOL_NAME);
  }
}

async function verifyMarketingNoop() {
  const document = {};
  loadMarketingScript(document);
  assert.equal(document.modelContext, undefined);
}

async function verifyMarketingNoopWithoutRegisterTool() {
  const document = {
    modelContext: {},
  };
  loadMarketingScript(document);
  assert.equal(typeof document.modelContext.registerTool, 'undefined');
}

async function verifyMarketingNavigatorFallback() {
  const modelContext = createFakeModelContext();
  const document = {
    getElementById() {
      return null;
    },
  };
  loadMarketingScript(document, {
    window: { navigator: { modelContext } },
  });
  await waitForTools(modelContext, MARKETING_TOOLS.length);
  const names = [...modelContext.tools.keys()].sort();
  sameJson(names, MARKETING_TOOLS);
}

async function verifyMarketingDocumentWinsOverNavigator() {
  const documentContext = createFakeModelContext();
  const navigatorContext = createFakeModelContext();
  const document = {
    modelContext: documentContext,
    getElementById() {
      return null;
    },
  };
  loadMarketingScript(document, {
    window: { navigator: { modelContext: navigatorContext } },
  });
  await waitForTools(documentContext, MARKETING_TOOLS.length);
  assert.equal(navigatorContext.tools.size, 0);
}

async function verifyMarketingTools() {
  const modelContext = createFakeModelContext();
  const overview = { id: 'overview', scrollIntoView() { this.scrolled = true; } };
  const document = {
    modelContext,
    getElementById(id) {
      return id === 'overview' ? overview : null;
    },
  };

  const { listeners } = loadMarketingScript(document);
  await waitForTools(modelContext, MARKETING_TOOLS.length);

  const names = [...modelContext.tools.keys()].sort();
  sameJson(names, MARKETING_TOOLS);
  assertToolNames(names);

  const product = await modelContext.executeTool({ name: 'get-product-info' });
  assert.equal(product.name, 'Traces');
  assert.equal(product.hostedSaaS, false);
  assert.equal(product.github, 'https://github.com/Sdefendre/traces-app');

  const install = await modelContext.executeTool({ name: 'get-install-instructions' });
  assert.ok(Array.from(install.commands).includes('pnpm dev'));

  const github = await modelContext.executeTool({ name: 'get-github-url' });
  assert.equal(github.url, 'https://github.com/Sdefendre/traces-app');

  const contact = await modelContext.executeTool({ name: 'get-contact' });
  assert.equal(contact.email, 'steve@defendresolutions.com');
  assert.equal(contact.sendsMail, false);

  const jumped = await modelContext.executeTool(
    { name: 'jump-to-section' },
    { section: 'overview' }
  );
  assert.equal(jumped.scrolled, true);
  assert.equal(overview.scrolled, true);

  const missing = await modelContext.executeTool(
    { name: 'jump-to-section' },
    { section: 'billing' }
  );
  assert.equal(missing.scrolled, false);
  sameJson(missing.available, ['overview', 'features', 'run']);

  const cancelled = new AbortController();
  cancelled.abort(new Error('stop'));
  await assert.rejects(
    () => modelContext.executeTool({ name: 'get-product-info' }, {}, { signal: cancelled.signal })
  );

  const pagehide = listeners.get('pagehide');
  assert.ok(pagehide, 'pagehide unregister listener');
  pagehide.fn();
  assert.equal(modelContext.tools.size, 0);
}

function verifyNoteHelpers() {
  const {
    matchNotePaths,
    resolveNotePath,
  } = require(path.join(root, 'scripts/.verify-out/src/lib/webmcp-notes.js'));

  const files = ['Memory/Index.md', 'Projects/Traces.md', 'Daily/2026-08-23.md'];

  assert.deepEqual(matchNotePaths(files, ''), []);
  assert.deepEqual(
    matchNotePaths(files, 'traces').map((row) => row.path),
    ['Projects/Traces.md']
  );

  assert.equal(resolveNotePath(files, 'Projects/Traces.md').path, 'Projects/Traces.md');
  assert.equal(resolveNotePath(files, 'Index').path, 'Memory/Index.md');
  assert.equal(resolveNotePath(files, 'missing').path, null);
}

function verifyContextResolver() {
  const {
    resolveModelContext,
  } = require(path.join(root, 'scripts/.verify-out/src/lib/webmcp-context.js'));

  const documentContext = { registerTool() {} };
  const navigatorContext = { registerTool() {} };

  assert.equal(resolveModelContext(undefined, undefined), undefined);
  assert.equal(resolveModelContext({ modelContext: {} }, undefined), undefined);
  assert.equal(
    resolveModelContext({ modelContext: documentContext }, { modelContext: navigatorContext }),
    documentContext
  );
  assert.equal(
    resolveModelContext({}, { modelContext: navigatorContext }),
    navigatorContext
  );
}

await verifyMarketingNoop();
await verifyMarketingNoopWithoutRegisterTool();
await verifyMarketingNavigatorFallback();
await verifyMarketingDocumentWinsOverNavigator();
await verifyMarketingTools();
verifyNoteHelpers();
verifyContextResolver();
console.log('webmcp verification ok');
