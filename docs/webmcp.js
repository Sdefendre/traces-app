/**
 * WebMCP tools for the Traces marketing site.
 *
 * Spec: https://webmachinelearning.github.io/webmcp/ (26 August 2026)
 * Canonical getter: document.modelContext.
 * Feature-detect: document.modelContext || navigator.modelContext, then registerTool.
 * Aborting the register signal unregisters. There is no unregisterTool.
 *
 * If the browser has no WebMCP (most browsers today), this file does nothing
 * and the page keeps working as a normal website.
 */
(function registerTracesMarketingWebMcp() {
  const global = typeof window !== 'undefined' ? window : globalThis;
  const doc = global.document;
  if (!doc) return;

  // Feature-detect. SecureContext + Permissions-Policy "tools" (default: self).
  const nav = global.navigator;
  const modelContext = doc.modelContext || (nav && nav.modelContext);
  if (!modelContext || typeof modelContext.registerTool !== 'function') return;

  const GITHUB_URL = 'https://github.com/Sdefendre/traces-app';
  const SITE_URL = 'https://sdefendre.github.io/traces-app/';

  // Public facts only. No user data, no vault, no secrets.
  const PRODUCT = {
    name: 'Traces',
    summary:
      'Local-first desktop knowledge workspace: markdown notes, a 3D wiki-link graph, and TracesAI.',
    kind: 'Electron + Next.js desktop app prototype',
    publisher: 'Defendre Solutions',
    license: 'MIT',
    hostedSaaS: false,
    notesStayOnDisk: true,
    marketingSite: SITE_URL,
    github: GITHUB_URL,
  };

  const INSTALL = {
    how: 'Clone the GitHub repo and run it on your machine. There is no App Store build and no hosted SaaS.',
    requirements: ['Node 18+', 'pnpm', 'optionally Ollama for local models'],
    commands: [
      'git clone https://github.com/Sdefendre/traces-app.git',
      'cd traces-app',
      'pnpm install',
      'pnpm dev',
    ],
    github: GITHUB_URL,
  };

  // Same public email already shown in the page footer. This tool never sends mail.
  const CONTACT = {
    email: 'steve@defendresolutions.com',
    name: 'Defendre Solutions',
    sendsMail: false,
  };

  const SECTIONS = {
    overview: { id: 'overview', label: 'Product overview' },
    features: { id: 'features', label: 'Features' },
    run: { id: 'run', label: 'Clone and run' },
  };

  const emptyInputSchema = {
    type: 'object',
    properties: {},
  };

  const controller = new AbortController();

  function throwIfAborted(signal) {
    if (signal && typeof signal.throwIfAborted === 'function') {
      signal.throwIfAborted();
      return;
    }
    if (signal && signal.aborted) {
      throw signal.reason || new Error('The WebMCP tool call was cancelled.');
    }
  }

  function unregister() {
    if (!controller.signal.aborted) controller.abort();
  }

  async function registerTools() {
    await modelContext.registerTool(
      {
        name: 'get-product-info',
        title: 'Get product info',
        description:
          'Describe Traces: what it is, that notes stay on disk, and that it is not a hosted SaaS.',
        inputSchema: emptyInputSchema,
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: async (_input, { signal }) => {
          throwIfAborted(signal);
          return PRODUCT;
        },
      },
      { signal: controller.signal }
    );

    await modelContext.registerTool(
      {
        name: 'get-install-instructions',
        title: 'How to get the app',
        description:
          'Explain how to clone and run Traces locally. Returns requirements and the install commands.',
        inputSchema: emptyInputSchema,
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: async (_input, { signal }) => {
          throwIfAborted(signal);
          return INSTALL;
        },
      },
      { signal: controller.signal }
    );

    await modelContext.registerTool(
      {
        name: 'get-github-url',
        title: 'Get GitHub URL',
        description: 'Return the public GitHub repository URL for Traces.',
        inputSchema: emptyInputSchema,
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: async (_input, { signal }) => {
          throwIfAborted(signal);
          return { url: GITHUB_URL };
        },
      },
      { signal: controller.signal }
    );

    await modelContext.registerTool(
      {
        name: 'get-contact',
        title: 'Get contact email',
        description:
          'Return the public Defendre Solutions email shown on this page. Does not send mail.',
        inputSchema: emptyInputSchema,
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: async (_input, { signal }) => {
          throwIfAborted(signal);
          return CONTACT;
        },
      },
      { signal: controller.signal }
    );

    await modelContext.registerTool(
      {
        name: 'jump-to-section',
        title: 'Jump to a page section',
        description:
          'Scroll this marketing page to overview, features, or the clone-and-run section.',
        inputSchema: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              description: 'Which section to show.',
              enum: Object.keys(SECTIONS),
            },
          },
          required: ['section'],
        },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: async (input, { signal }) => {
          throwIfAborted(signal);
          const key = typeof input.section === 'string' ? input.section : '';
          const target = Object.prototype.hasOwnProperty.call(SECTIONS, key)
            ? SECTIONS[key]
            : null;
          if (!target) {
            return {
              scrolled: false,
              available: Object.keys(SECTIONS),
            };
          }

          const element = doc.getElementById(target.id);
          if (!element) {
            return { scrolled: false, section: key, reason: 'Section is missing from the page.' };
          }

          throwIfAborted(signal);
          if (typeof element.scrollIntoView === 'function') {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return { scrolled: true, section: key, label: target.label };
        },
      },
      { signal: controller.signal }
    );
  }

  // Aborting the register signal unregisters every tool (spec 26 August 2026).
  if (typeof global.addEventListener === 'function') {
    global.addEventListener('pagehide', unregister, { once: true });
  }

  registerTools().catch((error) => {
    if (controller.signal.aborted) return;
    console.warn('WebMCP registration skipped.', error);
  });
})();
