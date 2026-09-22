/**
 * Builds the static site that the desktop app loads.
 *
 * next.config turns on a static export only when BUILD_STATIC is "1".
 * Writing that as `BUILD_STATIC=1 next build` works on Mac and Linux,
 * but Windows treats BUILD_STATIC as a program name and the build stops.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

const child = spawn(process.execPath, [nextBin, 'build'], {
  stdio: 'inherit',
  env: { ...process.env, BUILD_STATIC: '1' },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
