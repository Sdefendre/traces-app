import { streamText, type LanguageModel } from 'ai';

// Shared chat types used by the Next route and the Electron handler.
export interface StreamChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamChatToolCall {
  name: string;
  args: Record<string, string>;
  result: string;
}

export interface StreamChatResult {
  message: string;
  toolCalls: StreamChatToolCall[];
}

/**
 * Stream a reply with AI SDK 5 (`streamText` + `textStream`).
 *
 * v4 used `toDataStreamResponse()` / `fullStream` with `textDelta`.
 * v5 consumes `textStream` (string deltas) and keeps the same
 * `{ message, toolCalls }` shape the desktop chat UI already expects.
 */
export async function streamChatWithModel(options: {
  model: LanguageModel;
  messages: StreamChatMessage[];
  system?: string;
}): Promise<StreamChatResult> {
  const systemFromMessages = options.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  const system = options.system || systemFromMessages || undefined;

  const messages = options.messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    }));

  const result = streamText({
    model: options.model,
    system,
    messages,
  });

  let message = '';
  for await (const delta of result.textStream) {
    message += delta;
  }

  return { message, toolCalls: [] };
}
