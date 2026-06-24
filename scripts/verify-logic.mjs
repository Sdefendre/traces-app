/**
 * Direct verification of shipped pure logic (no React/Electron runtime).
 * Run after: pnpm build:electron
 * Loads: main/dist/main/ipc/vault-parser.js, main/dist/shared/build-tree.js
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseVault } = require('../main/dist/main/ipc/vault-parser.js');
const { buildTree } = require('../main/dist/shared/build-tree.js');

const sampleFiles = ['Memory/a.md', 'Workspace/b.md', 'Memory/sub/c.md', 'Memory\\dup.md'];

const contentCache = new Map([
  ['Memory/a.md', '[[b]]'],
  ['Workspace/b.md', ''],
  ['Memory/sub/c.md', ''],
  ['Memory/dup.md', ''],
]);

const data = await parseVault('/tmp/vault-verify', sampleFiles, contentCache);
const uniqueIds = new Set(data.nodes.map((n) => n.id)).size === data.nodes.length;
const fullPathIds = data.nodes.every((n) => n.id.includes('/'));

console.log('nodes:', data.nodes.length);
console.log('uniqueIds:', uniqueIds);
console.log('fullPathIds:', fullPathIds);

const tree = buildTree(sampleFiles);
console.log('tree depth ok:', tree.length > 0);

if (!uniqueIds || !fullPathIds || tree.length === 0) {
  process.exit(1);
}