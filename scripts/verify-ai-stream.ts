/**
 * Prove AI SDK 5 streaming through the desktop handler and the Next chat route.
 * Uses MockLanguageModelV2 — no real provider is called.
 */
import assert from 'node:assert/strict';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV2 } from 'ai/test';
import { handleChat } from '../main/ipc/chat-handler';
import { handleChatRoute } from '../src/app/api/chat/route';

// Build a v5 mock model that emits several text deltas, then finishes.
function createStreamingModel() {
  return new MockLanguageModelV2({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'stream-start', warnings: [] },
          { type: 'text-start', id: 'text-1' },
          { type: 'text-delta', id: 'text-1', delta: 'Hello' },
          { type: 'text-delta', id: 'text-1', delta: ', ' },
          { type: 'text-delta', id: 'text-1', delta: 'Traces.' },
          { type: 'text-end', id: 'text-1' },
          {
            type: 'finish',
            finishReason: 'stop',
            usage: { inputTokens: 3, outputTokens: 4, totalTokens: 7 },
          },
        ],
      }),
    }),
  });
}

const request = {
  messages: [{ role: 'user' as const, content: 'Hi' }],
  provider: 'openai' as const,
  model: 'mock-model',
};

async function main() {
  const handlerResult = await handleChat({
    ...request,
    languageModel: createStreamingModel(),
  });
  assert.equal(handlerResult.message, 'Hello, Traces.');
  assert.deepEqual(handlerResult.toolCalls, []);

  const routeResponse = await handleChatRoute(request, {
    languageModel: createStreamingModel(),
  });
  assert.equal(routeResponse.status, 200);
  const routeBody = (await routeResponse.json()) as { message: string; toolCalls: unknown[] };
  assert.equal(routeBody.message, 'Hello, Traces.');
  assert.deepEqual(routeBody.toolCalls, []);

  console.log('ai-stream verification passed');
}

void main();
