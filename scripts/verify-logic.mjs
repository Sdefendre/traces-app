/**
 * Plan step 2: after `pnpm build:electron`, exercise shipped parseVault + buildTree.
 * Also runs direct require of compiled modules (no extra build precondition).
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

// Graph-node metadata gate: preserve normalized IDs while sizing cache hits,
// disk reads, duplicate basenames, and unreadable files deterministically.
const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'traces-vault-parser-'));
try {
  const cachedContent = 'cached markdown';
  const diskContent = 'uncached markdown from disk';
  const firstDuplicateContent = 'first';
  const secondDuplicateContent = 'second duplicate';
  const diskPath = path.join(fixtureRoot, 'Workspace', 'disk.md');

  await mkdir(path.dirname(diskPath), { recursive: true });
  await writeFile(diskPath, diskContent, 'utf8');

  const metadataFiles = [
    'Memory\\cached.md',
    'Workspace\\disk.md',
    'Archive/missing.md',
    'Memory/one/shared.md',
    'Workspace/two/shared.md',
  ];
  const metadataCache = new Map([
    ['Memory/cached.md', cachedContent],
    ['Memory/one/shared.md', firstDuplicateContent],
    ['Workspace/two/shared.md', secondDuplicateContent],
  ]);

  const metadataData = await parseVault(fixtureRoot, metadataFiles, metadataCache);
  const nodesById = new Map(metadataData.nodes.map((node) => [node.id, node]));

  assert.equal(nodesById.get('Memory/cached.md')?.fileSize, cachedContent.length);
  assert.equal(nodesById.get('Workspace/disk.md')?.fileSize, diskContent.length);
  assert.equal(nodesById.get('Archive/missing.md')?.fileSize, 0);
  assert.equal(nodesById.get('Memory/one/shared.md')?.fileSize, firstDuplicateContent.length);
  assert.equal(nodesById.get('Workspace/two/shared.md')?.fileSize, secondDuplicateContent.length);
  assert.equal(metadataCache.get('Workspace/disk.md'), diskContent);
  assert.ok(metadataData.nodes.every((node) => Number.isFinite(node.fileSize)));

  console.log('fileSize metadata ok:', true);
} finally {
  await rm(fixtureRoot, { recursive: true, force: true });
}

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
