/**
 * Verifies:
 * 1. Switching defaultProvider in Settings resolves a valid defaultModel for the new provider.
 * 2. Custom Ollama endpoints are normalized and actually used by handleChat.
 * 3. ChatPanel checks for a missing API key before setting sendingRef.current = true.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_SETTINGS,
  BYO_DEFAULT_MODEL,
  resolveDefaultModelForProvider,
} from '../src/stores/settings-store';
import { DEFAULT_OLLAMA_ENDPOINT, normalizeOllamaEndpoint } from '../shared/ollama';
import { handleChat } from '../main/ipc/chat-handler';

async function main() {
  // 1. resolveDefaultModelForProvider
  assert.equal(
    resolveDefaultModelForProvider(DEFAULT_SETTINGS, 'openai'),
    DEFAULT_SETTINGS.enabledModels.openai[0],
    'switching from anthropic to openai selects the first enabled OpenAI model',
  );
  assert.equal(
    resolveDefaultModelForProvider(
      { ...DEFAULT_SETTINGS, defaultProvider: 'codex', defaultModel: BYO_DEFAULT_MODEL },
      'google',
    ),
    DEFAULT_SETTINGS.enabledModels.google[0],
    'switching from BYO agent to google selects the first enabled Google model',
  );
  assert.equal(
    resolveDefaultModelForProvider(
      { ...DEFAULT_SETTINGS, defaultProvider: 'openai', defaultModel: 'gpt-4o' },
      'openai',
    ),
    'gpt-4o',
    'keeping the same provider preserves an already-valid defaultModel',
  );
  assert.equal(
    resolveDefaultModelForProvider(DEFAULT_SETTINGS, 'claude'),
    BYO_DEFAULT_MODEL,
    'switching to a BYO agent selects default',
  );
  assert.equal(
    resolveDefaultModelForProvider(DEFAULT_SETTINGS, 'ollama'),
    '',
    'switching to ollama clears API-provider defaultModel',
  );
  assert.equal(
    resolveDefaultModelForProvider(
      {
        ...DEFAULT_SETTINGS,
        enabledModels: { ...DEFAULT_SETTINGS.enabledModels, xai: [] },
      },
      'xai',
    ),
    '',
    'provider with no enabled models falls back to empty string',
  );

  // 2. normalizeOllamaEndpoint
  assert.equal(normalizeOllamaEndpoint(), DEFAULT_OLLAMA_ENDPOINT);
  assert.equal(normalizeOllamaEndpoint('   '), DEFAULT_OLLAMA_ENDPOINT);
  assert.equal(normalizeOllamaEndpoint('http://127.0.0.1:11435///'), 'http://127.0.0.1:11435');
  assert.equal(normalizeOllamaEndpoint('https://ollama.example.com/'), 'https://ollama.example.com');
  assert.throws(() => normalizeOllamaEndpoint('not a url'), /Invalid Ollama endpoint URL/);
  assert.throws(() => normalizeOllamaEndpoint('file:///etc/passwd'), /Invalid Ollama endpoint protocol/);

  // 3. handleChat routes Ollama requests to the configured custom endpoint
  let hitPath = '';
  let receivedModel = '';
  const server = http.createServer((req, res) => {
    hitPath = req.url ?? '';
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const parsed = JSON.parse(body) as { model?: string };
      receivedModel = parsed.model ?? '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: { role: 'assistant', content: 'pong from custom ollama' } }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const customEndpoint = `http://127.0.0.1:${address.port}/`;

  try {
    const result = await handleChat({
      messages: [{ role: 'user', content: 'ping' }],
      provider: 'ollama',
      model: 'llama3.2',
      ollamaEndpoint: customEndpoint,
    });
    assert.equal(hitPath, '/api/chat');
    assert.equal(receivedModel, 'llama3.2');
    assert.equal(result.message, 'pong from custom ollama');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }

  // 4. Regression guard: ChatPanel checks missing API key before acquiring sendingRef
  const chatPanelPath = path.resolve(__dirname, '../../../src/components/chat/ChatPanel.tsx');
  const chatSource = readFileSync(chatPanelPath, 'utf8');
  const submitStart = chatSource.indexOf('const handleSubmit = async () => {');
  assert.ok(submitStart !== -1, 'handleSubmit exists in ChatPanel.tsx');
  const submitSlice = chatSource.slice(submitStart, submitStart + 500);
  const keyGuardIdx = submitSlice.indexOf("Add an API key for this provider");
  const lockSetIdx = submitSlice.indexOf('sendingRef.current = true;');
  assert.ok(keyGuardIdx !== -1 && lockSetIdx !== -1, 'missing key guard and sendingRef lock present');
  assert.ok(
    keyGuardIdx < lockSetIdx,
    'ChatPanel must check for missing API key before setting sendingRef.current = true',
  );

  console.log('chat-settings verification passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
