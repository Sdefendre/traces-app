/**
 * After `pnpm build:electron`, exercise the compiled BYO runtime.
 * Uses missing CLIs plus throwaway fake binaries. Never talks to vendor APIs.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { setVaultRoot } = require('../main/dist/main/ipc/file-system.js');
const { getByoAgentStatus, startByoAgentLogin, handleByoChat } = require('../main/dist/main/ipc/byo-agents.js');
const { handleChat } = require('../main/dist/main/ipc/chat-handler.js');

function expect(condition, label) {
  if (!condition) throw new Error(label);
}

function writeFakeCli(dir, name, body) {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, `#!/usr/bin/env bash\n${body}\n`);
  fs.chmodSync(filePath, 0o755);
}

const vault = fs.mkdtempSync(path.join(os.tmpdir(), 'traces-byo-vault-'));
setVaultRoot(vault);

const missing = await getByoAgentStatus('codex');
expect(!missing.installed && !missing.signedIn, 'codex missing in this environment');
expect(missing.detail.includes('not found'), 'missing detail names the gap');

try {
  await handleChat({
    messages: [{ role: 'user', content: 'hi' }],
    provider: 'claude',
    model: 'default',
  });
  throw new Error('missing claude should fail closed');
} catch (error) {
  expect(String(error.message).includes('will not fall back'), 'handleChat fail-closed copy');
}

const login = await startByoAgentLogin('grok-cli');
expect(!login.started, 'login does not start without grok');
expect(login.detail.includes('will not fall back'), 'login fail-closed copy');

const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'traces-byo-bin-'));
process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH ?? ''}`;

writeFakeCli(
  binDir,
  'codex',
  `
case "$1" in
  login)
    if [ "$2" = "status" ]; then
      echo "Logged in using ChatGPT"
      exit 0
    fi
    echo "login started"
    exit 0
    ;;
  exec)
    echo '{"result":"codex saw the vault"}'
    exit 0
    ;;
  *)
    echo "unknown" >&2
    exit 2
    ;;
esac
`,
);

writeFakeCli(
  binDir,
  'claude',
  `
if [ "$1" = "auth" ] && [ "$2" = "status" ]; then
  echo '{"loggedIn":false}'
  echo "not signed in" >&2
  exit 1
fi
echo "should not chat while logged out" >&2
exit 1
`,
);

writeFakeCli(
  binDir,
  'grok',
  `
if [ "$1" = "models" ]; then
  echo "please log in"
  exit 0
fi
echo "blocked" >&2
exit 1
`,
);

const signedIn = await getByoAgentStatus('codex');
expect(signedIn.installed && signedIn.signedIn, 'fake codex reports signed in');
expect(signedIn.resolvedPath.includes(binDir), 'resolved the fake binary');

const loggedOut = await getByoAgentStatus('claude');
expect(loggedOut.installed && !loggedOut.signedIn, 'fake claude reports logged out');

const grokBlocked = await getByoAgentStatus('grok-cli');
expect(grokBlocked.installed && !grokBlocked.signedIn, 'grok login-required text fails closed');

const reply = await handleByoChat({
  messages: [{ role: 'user', content: 'hello' }],
  provider: 'codex',
  systemPrompt: 'You are TracesAI.',
});
expect(reply.message === 'codex saw the vault', 'codex chat uses CLI stdout');

try {
  await handleByoChat({
    messages: [{ role: 'user', content: 'hello' }],
    provider: 'claude',
    systemPrompt: 'You are TracesAI.',
  });
  throw new Error('logged-out claude should not chat');
} catch (error) {
  expect(String(error.message).includes('will not fall back'), 'logged-out chat fail-closed');
}

console.log('verify-byo-runtime ok');
