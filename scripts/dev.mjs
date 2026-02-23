import concurrently from 'concurrently';

concurrently(
  [
    {
      command: 'npx next dev -p 3333',
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
    killOthers: ['failure', 'success'],
    restartTries: 0,
  }
);
