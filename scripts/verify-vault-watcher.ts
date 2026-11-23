/**
 * Vault watcher ignore rules must only inspect paths relative to the vault root.
 * A vault stored under a hidden parent (e.g. ~/.notes) or an ancestor named
 * Google-Drive must still receive chokidar events for notes inside it.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { watch } from 'chokidar';
import { isIgnoredVaultPath } from '../main/ipc/vault-watcher';

async function main() {
  const dotParentVault = '/tmp/.hidden-parent/vault';
  assert.equal(isIgnoredVaultPath(dotParentVault, dotParentVault), false, 'vault root itself is not ignored');
  assert.equal(isIgnoredVaultPath(dotParentVault, path.join(dotParentVault, 'note.md')), false, 'note inside dot-parent vault is watched');
  assert.equal(isIgnoredVaultPath(dotParentVault, path.join(dotParentVault, 'sub', 'note.md')), false, 'nested note inside dot-parent vault is watched');
  assert.equal(isIgnoredVaultPath(dotParentVault, path.join(dotParentVault, '.obsidian', 'config.json')), true, 'hidden dir inside vault is ignored');
  assert.equal(isIgnoredVaultPath(dotParentVault, path.join(dotParentVault, '.hidden.md')), true, 'dotfile inside vault is ignored');
  assert.equal(isIgnoredVaultPath(dotParentVault, path.join(dotParentVault, 'node_modules', 'pkg', 'a.md')), true, 'node_modules inside vault is ignored');
  assert.equal(isIgnoredVaultPath(dotParentVault, path.join(dotParentVault, 'Google-Drive', 'a.md')), true, 'Google-Drive inside vault is ignored');

  const driveParentVault = '/tmp/Google-Drive/Notes';
  assert.equal(isIgnoredVaultPath(driveParentVault, path.join(driveParentVault, 'daily.md')), false, 'vault inside Google-Drive ancestor is watched');

  // Live chokidar proof: creating a note inside a dot-prefixed ancestor emits `add`,
  // while creating a file in `.hidden/` inside the vault does not.
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'traces-watcher-'));
  const vaultRoot = path.join(base, '.dot-parent', 'vault');
  await fs.mkdir(path.join(vaultRoot, '.hidden'), { recursive: true });

  const added: string[] = [];
  const watcher = watch(vaultRoot, {
    ignored: (filePath: string) => isIgnoredVaultPath(vaultRoot, filePath),
    persistent: true,
    ignoreInitial: true,
  });

  try {
    await new Promise<void>((resolve) => watcher.on('ready', () => resolve()));
    const noteAdded = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for note add event')), 5000);
      watcher.on('add', (p: string) => {
        added.push(p);
        if (path.basename(p) === 'visible.md') {
          clearTimeout(timer);
          resolve(p);
        }
      });
    });

    await fs.writeFile(path.join(vaultRoot, '.hidden', 'ignored.md'), '# ignored', 'utf8');
    await fs.writeFile(path.join(vaultRoot, 'visible.md'), '# visible', 'utf8');
    const seen = await noteAdded;
    assert.equal(path.basename(seen), 'visible.md');
    assert.equal(
      added.some((p) => path.basename(p) === 'ignored.md'),
      false,
      'hidden file inside vault must stay ignored',
    );
  } finally {
    await watcher.close();
    await fs.rm(base, { recursive: true, force: true });
  }

  console.log('vault-watcher verification passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
