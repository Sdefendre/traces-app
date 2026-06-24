/**
 * Plan step 2: after `pnpm build:electron`, exercise shipped parseVault + buildTree.
 * Also runs direct require of compiled modules (no extra build precondition).
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const parserPath = require.resolve('../main/dist/main/ipc/vault-parser.js');
const treePath = require.resolve('../main/dist/shared/build-tree.js');

const { parseVault } = require(parserPath);
const { buildTree } = require(treePath);

console.log('direct-require parser:', parserPath);
console.log('direct-require tree:', treePath);

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

// Warm-cache gate (compiled main/ipc/vault-file-cache.js)
const { isWarm, markWarm, resetVaultFileCache, setKnownFiles } = require(
  '../main/dist/main/ipc/vault-file-cache.js'
);
resetVaultFileCache();
setKnownFiles(['Memory/a.md']);
markWarm('/tmp/vault-warm');
const warmOk = isWarm('/tmp/vault-warm');
const coldOk = !isWarm('/other/vault');
console.log('warmCache ok:', warmOk && coldOk);

if (!uniqueIds || !fullPathIds || tree.length === 0 || !warmOk || !coldOk) {
  process.exit(1);
}