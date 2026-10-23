/**
 * Prove AI SDK 5 streaming through streamChatWithModel and the Electron handler.
 * Uses MockLanguageModelV2 — no real provider is called. The Next route uses
 * the same helper; Next only allows POST to be exported from route.ts.
 */
import assert from 'node:assert/strict';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV2 } from 'ai/test';
import { streamChatWithModel } from '../shared/ai-chat';
import { handleChat } from '../main/ipc/chat-handler';

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
  const streamed = await streamChatWithModel({
    model: createStreamingModel(),
    messages: request.messages,
    system: 'You are Traces.',
  });
  assert.equal(streamed.message, 'Hello, Traces.');
  assert.deepEqual(streamed.toolCalls, []);

  const handlerResult = await handleChat({
    ...request,
    languageModel: createStreamingModel(),
  });
  assert.equal(handlerResult.message, 'Hello, Traces.');
  assert.deepEqual(handlerResult.toolCalls, []);

  console.log('ai-stream verification passed');
}

void main();
