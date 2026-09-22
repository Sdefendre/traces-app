/**
 * Cross-platform `BUILD_STATIC=1 next build`.
 *
 * `VAR=value command` is shell syntax that only bash/zsh understand; on Windows
 * (cmd.exe / PowerShell in GitHub Actions) it fails with "'BUILD_STATIC' is not
 * recognized as an internal or external command". Setting the variable from Node
 * keeps the static-export flag baked into `pnpm build:next` on every OS, so
 * `pnpm build` / `pnpm dist` behave the same locally and in CI/Release.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Run Next's entry file with the current Node binary instead of the `next`
// shim so we don't depend on `.cmd` wrappers or PATH lookups on Windows.
const nextBin = require.resolve('next/dist/bin/next');

const result = spawnSync(process.execPath, [nextBin, 'build', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, BUILD_STATIC: '1' },
});

if (result.error) {
  console.error('[build:next] Failed to start next build:', result.error);
  process.exit(1);
}

// A null status means the child was killed by a signal; treat that as failure.
process.exit(result.status ?? 1);
