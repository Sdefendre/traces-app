import concurrently from 'concurrently';

// Dev launcher: Next.js + Electron with graceful SIGINT/SIGTERM shutdown.
let shuttingDown = false;

function gracefulExit(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exit(code);
}

process.on('SIGINT', () => gracefulExit(0));
process.on('SIGTERM', () => gracefulExit(0));

const { result } = concurrently(
  [
    {
      command: 'npx next dev -p 3333 --turbo',
      name: 'next',
      prefixColor: 'cyan',
    },
    {
      command:
        'npx wait-on http://localhost:3333 && npx tsc -p tsconfig.electron.json && npx electron .',
      name: 'electron',
      prefixColor: 'magenta',
    },
  ],
  {
    killOthersOn: ['failure', 'success'],
    restartTries: 0,
  }
);

result
  .then(() => gracefulExit(0))
  .catch((err) => {
    if (shuttingDown) {
      gracefulExit(0);
      return;
    }
    console.error('[dev] One or more processes exited:', err);
    gracefulExit(1);
  });