import concurrently from 'concurrently';

concurrently(
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
