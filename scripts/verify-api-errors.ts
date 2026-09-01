/**
 * Upstream AI/voice failures must reach the user as a readable sentence,
 * not a raw status code plus a JSON blob.
 */
import assert from 'node:assert/strict';
import { extractErrorMessage, formatUpstreamError } from '../shared/api-errors';

// extractErrorMessage: JSON bodies
assert.equal(extractErrorMessage('{"error":{"message":"Invalid API key"}}'), 'Invalid API key');
assert.equal(extractErrorMessage('{"error":"Rate limit exceeded"}'), 'Rate limit exceeded');
assert.equal(extractErrorMessage('{"message":"Not found"}'), 'Not found');
assert.equal(extractErrorMessage('{"detail":"Model unavailable"}'), 'Model unavailable');
assert.equal(extractErrorMessage('{"error_description":"Token expired"}'), 'Token expired');
assert.equal(
  extractErrorMessage('{"error":{"type":"auth","message":"Bad key"}}'),
  'Bad key',
  'nested objects are searched for a message'
);
assert.equal(extractErrorMessage('{"status":401}'), '', 'no recognised key yields empty string');
assert.equal(extractErrorMessage('{"error":{"code":401}}'), '', 'non-string leaves yield empty string');

// extractErrorMessage: plain text and edge cases
assert.equal(extractErrorMessage(''), '');
assert.equal(extractErrorMessage('   '), '');
assert.equal(extractErrorMessage('  Service unavailable  '), 'Service unavailable');
assert.equal(extractErrorMessage('{not valid json'), '{not valid json', 'malformed JSON falls back to text');

const longBody = 'x'.repeat(500);
const truncated = extractErrorMessage(longBody);
assert.equal(truncated.length, 240, 'long bodies are truncated to 240 characters');
assert.ok(truncated.endsWith('…'), 'truncation is signalled with an ellipsis');

// formatUpstreamError: sentence assembly and status hints
assert.equal(
  formatUpstreamError('OpenAI', 401, '{"error":{"message":"Incorrect API key provided"}}'),
  'OpenAI request failed (401). Incorrect API key provided. Check that the API key in Settings > AI & Models is correct.'
);
assert.equal(
  formatUpstreamError('xAI', 403, ''),
  'xAI request failed (403). Check that the API key in Settings > AI & Models is correct.'
);
assert.equal(
  formatUpstreamError('Anthropic', 429, 'Too many requests.'),
  'Anthropic request failed (429). Too many requests. You are being rate limited — wait a moment and try again.',
  'existing trailing period is not doubled'
);
assert.equal(
  formatUpstreamError('Gemini', 503, '<html>Bad gateway</html>'),
  'Gemini request failed (503). <html>Bad gateway</html>. The provider is having trouble; try again shortly.'
);
assert.equal(
  formatUpstreamError('Ollama', 404, '{"error":"model not found"}'),
  'Ollama request failed (404). model not found.',
  'statuses without a hint end after the detail'
);
assert.equal(formatUpstreamError('OpenAI', 400, ''), 'OpenAI request failed (400).');

console.log('api-errors verification passed');
