/**
 * Pure checks for bring-your-own agent fail-closed helpers.
 * These do not call real CLIs and must not invent credentials.
 */
import {
  BYO_AGENTS,
  assertByoReady,
  buildByoPrompt,
  buildChatArgs,
  extractAssistantText,
  failClosedMessage,
  interpretStatusProbe,
  isByoAgentId,
  redactSecrets,
  type ByoAgentStatus,
} from '../shared/byo-agents';

function expect(condition: boolean, label: string) {
  if (!condition) throw new Error(label);
}

const missingCodex: ByoAgentStatus = {
  id: 'codex',
  label: 'Codex',
  binary: 'codex',
  installed: false,
  signedIn: false,
  resolvedPath: null,
  detail: 'missing',
};

const loggedOutClaude: ByoAgentStatus = {
  id: 'claude',
  label: 'Claude',
  binary: 'claude',
  installed: true,
  signedIn: false,
  resolvedPath: '/usr/local/bin/claude',
  detail: 'not signed in',
};

expect(isByoAgentId('codex'), 'codex is a BYO id');
expect(isByoAgentId('grok-cli'), 'grok-cli is a BYO id');
expect(isByoAgentId('claude'), 'claude is a BYO id');
expect(!isByoAgentId('openai'), 'openai stays an API-key provider');
expect(!isByoAgentId('xai'), 'xai stays an API-key provider');

const missingMessage = failClosedMessage(missingCodex);
expect(missingMessage.includes('not installed'), 'missing CLI message');
expect(missingMessage.includes('will not fall back'), 'missing CLI fail-closed');

const loggedOutMessage = failClosedMessage(loggedOutClaude);
expect(loggedOutMessage.includes('not signed in'), 'logged-out message');
expect(loggedOutMessage.includes('claude auth login'), 'logged-out names the login command');

try {
  assertByoReady(missingCodex);
  throw new Error('missing Codex should fail closed');
} catch (error) {
  expect(error instanceof Error && error.message.includes('will not fall back'), 'assert fail-closed');
}

const redacted = redactSecrets('key sk-proj-ABC123456789 and Bearer abc.def and xai-ZZZZYYYY1111');
expect(!redacted.includes('sk-proj-ABC123456789'), 'redacts openai-shaped keys');
expect(!redacted.includes('abc.def'), 'redacts bearer tokens');
expect(!redacted.includes('xai-ZZZZYYYY1111'), 'redacts xai-shaped keys');

const signedIn = interpretStatusProbe({
  id: 'codex',
  installed: true,
  result: { exitCode: 0, stdout: 'Logged in using ChatGPT', stderr: '' },
});
expect(signedIn.signedIn, 'codex exit 0 is signed in');

const loggedOut = interpretStatusProbe({
  id: 'codex',
  installed: true,
  result: { exitCode: 1, stdout: 'Not logged in', stderr: '' },
});
expect(!loggedOut.signedIn, 'codex exit 1 is logged out');

const grokNeedsLogin = interpretStatusProbe({
  id: 'grok-cli',
  installed: true,
  result: { exitCode: 0, stdout: 'please log in', stderr: '' },
});
expect(!grokNeedsLogin.signedIn, 'login-required text fails closed even on exit 0');

const claudeOk = interpretStatusProbe({
  id: 'claude',
  installed: true,
  result: { exitCode: 0, stdout: '{"loggedIn":true}', stderr: '' },
});
expect(claudeOk.signedIn, 'claude exit 0 is signed in');

const notInstalled = interpretStatusProbe({
  id: 'grok-cli',
  installed: false,
  result: null,
});
expect(!notInstalled.signedIn, 'missing grok is not signed in');

const prompt = buildByoPrompt({
  systemPrompt: 'You are TracesAI.',
  messages: [
    { role: 'system', content: 'ignore' },
    { role: 'user', content: 'List my notes' },
  ],
});
expect(prompt.includes('You are TracesAI.'), 'keeps system prompt');
expect(prompt.includes('User: List my notes'), 'keeps user turn');
expect(!prompt.includes('ignore'), 'drops extra system turns');

const vault = '/tmp/traces-vault';
const codexArgs = buildChatArgs({ id: 'codex', prompt: 'hello', vaultRoot: vault });
expect(codexArgs[0] === 'exec', 'codex uses exec');
expect(codexArgs.includes('--sandbox'), 'codex stays in workspace sandbox');
expect(codexArgs.includes('hello'), 'codex gets the prompt');

const claudeArgs = buildChatArgs({ id: 'claude', prompt: 'hello', vaultRoot: vault });
expect(claudeArgs.includes('-p'), 'claude uses print mode');
expect(claudeArgs.includes('acceptEdits'), 'claude can edit vault files');

const grokArgs = buildChatArgs({ id: 'grok-cli', prompt: 'hello', vaultRoot: vault });
expect(grokArgs.includes('-p'), 'grok uses headless -p');
expect(grokArgs.includes(vault), 'grok gets the vault path');
expect(grokArgs.includes('--always-approve'), 'grok can run non-interactively');

expect(extractAssistantText('{"result":"Vault has 3 notes"}') === 'Vault has 3 notes', 'extracts result');
expect(
  extractAssistantText('{"type":"item","item":{"text":"Done"}}\n{"result":"Final"}') === 'Final',
  'prefers last NDJSON result',
);
expect(extractAssistantText('plain reply') === 'plain reply', 'keeps plain text');

expect(BYO_AGENTS.codex.loginCommand === 'codex login', 'codex login copy');
expect(BYO_AGENTS['grok-cli'].loginCommand === 'grok login', 'grok login copy');
expect(BYO_AGENTS.claude.loginCommand === 'claude auth login', 'claude login copy');

console.log('verify-byo-agents ok');
