import {
  listFiles,
  readFile,
  writeFile,
  createFile,
  deleteFile,
} from './file-system';
import { isByoAgentId } from '../../shared/byo-agents';
import { formatUpstreamError } from '../../shared/api-errors';
import { handleByoChat } from './byo-agents';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchJSON(res: Response): Promise<any> {
  return res.json();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Provider = 'ollama' | 'openai' | 'anthropic' | 'xai' | 'google' | 'codex' | 'grok-cli' | 'claude';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ToolCallRecord {
  name: string;
  args: Record<string, string>;
  result: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  provider: Provider;
  model: string;
  apiKey?: string;
  systemPrompt?: string;
}

interface ChatResult {
  message: string;
  toolCalls: ToolCallRecord[];
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  'You are Traces, an AI assistant embedded in a knowledge management app called Traces. ' +
  "You can read, write, edit, search, and delete files in the user's vault. " +
  'Use tools to help the user manage their notes and knowledge base. ' +
  'Always be helpful and proactive.';

// ---------------------------------------------------------------------------
// Tool definitions — provider-specific formats
// ---------------------------------------------------------------------------

function toolsForOpenAI() {
  return [
    {
      type: 'function' as const,
      function: {
        name: 'list_files',
        description: 'List all files in the current vault',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'read_file',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string', description: 'The file path relative to vault root' } },
          required: ['path'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'write_file',
        description: 'Write or create a file with given content',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'The file path relative to vault root' },
            content: { type: 'string', description: 'The content to write' },
          },
          required: ['path', 'content'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'edit_file',
        description: 'Edit a file by replacing old text with new text',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'The file path relative to vault root' },
            old_text: { type: 'string', description: 'The text to find and replace' },
            new_text: { type: 'string', description: 'The replacement text' },
          },
          required: ['path', 'old_text', 'new_text'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'delete_file',
        description: 'Delete a file',
        parameters: {
          type: 'object',
          properties: { path: { type: 'string', description: 'The file path relative to vault root' } },
          required: ['path'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'search_files',
        description: 'Search for text across all files in the vault',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string', description: 'The search query' } },
          required: ['query'],
        },
      },
    },
  ];
}

function toolsForAnthropic() {
  return [
    {
      name: 'list_files',
      description: 'List all files in the current vault',
      input_schema: { type: 'object' as const, properties: {}, required: [] as string[] },
    },
    {
      name: 'read_file',
      description: 'Read the contents of a file',
      input_schema: {
        type: 'object' as const,
        properties: { path: { type: 'string', description: 'The file path relative to vault root' } },
        required: ['path'],
      },
    },
    {
      name: 'write_file',
      description: 'Write or create a file with given content',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string', description: 'The file path relative to vault root' },
          content: { type: 'string', description: 'The content to write' },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'edit_file',
      description: 'Edit a file by replacing old text with new text',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string', description: 'The file path relative to vault root' },
          old_text: { type: 'string', description: 'The text to find and replace' },
          new_text: { type: 'string', description: 'The replacement text' },
        },
        required: ['path', 'old_text', 'new_text'],
      },
    },
    {
      name: 'delete_file',
      description: 'Delete a file',
      input_schema: {
        type: 'object' as const,
        properties: { path: { type: 'string', description: 'The file path relative to vault root' } },
        required: ['path'],
      },
    },
    {
      name: 'search_files',
      description: 'Search for text across all files in the vault',
      input_schema: {
        type: 'object' as const,
        properties: { query: { type: 'string', description: 'The search query' } },
        required: ['query'],
      },
    },
  ];
}

function toolsForGemini() {
  return [
    {
      functionDeclarations: [
        {
          name: 'list_files',
          description: 'List all files in the current vault',
          parameters: { type: 'OBJECT', properties: {}, required: [] },
        },
        {
          name: 'read_file',
          description: 'Read the contents of a file',
          parameters: {
            type: 'OBJECT',
            properties: { path: { type: 'STRING', description: 'The file path relative to vault root' } },
            required: ['path'],
          },
        },
        {
          name: 'write_file',
          description: 'Write or create a file with given content',
          parameters: {
            type: 'OBJECT',
            properties: {
              path: { type: 'STRING', description: 'The file path relative to vault root' },
              content: { type: 'STRING', description: 'The content to write' },
            },
            required: ['path', 'content'],
          },
        },
        {
          name: 'edit_file',
          description: 'Edit a file by replacing old text with new text',
          parameters: {
            type: 'OBJECT',
            properties: {
              path: { type: 'STRING', description: 'The file path relative to vault root' },
              old_text: { type: 'STRING', description: 'The text to find and replace' },
              new_text: { type: 'STRING', description: 'The replacement text' },
            },
            required: ['path', 'old_text', 'new_text'],
          },
        },
        {
          name: 'delete_file',
          description: 'Delete a file',
          parameters: {
            type: 'OBJECT',
            properties: { path: { type: 'STRING', description: 'The file path relative to vault root' } },
            required: ['path'],
          },
        },
        {
          name: 'search_files',
          description: 'Search for text across all files in the vault',
          parameters: {
            type: 'OBJECT',
            properties: { query: { type: 'STRING', description: 'The search query' } },
            required: ['query'],
          },
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Tool execution — uses file-system.ts functions
// ---------------------------------------------------------------------------

async function executeTool(
  toolName: string,
  args: Record<string, string>,
): Promise<string> {
  switch (toolName) {
    case 'list_files': {
      const files = await listFiles();
      return JSON.stringify(files);
    }
    case 'read_file': {
      return await readFile(args.path);
    }
    case 'write_file': {
      await createFile(args.path, args.content);
      return `File written: ${args.path}`;
    }
    case 'edit_file': {
      const content = await readFile(args.path);
      if (!content.includes(args.old_text)) {
        return `Error: Could not find the specified text in ${args.path}`;
      }
      const updated = content.replace(args.old_text, args.new_text);
      await writeFile(args.path, updated);
      return `File edited: ${args.path}`;
    }
    case 'delete_file': {
      await deleteFile(args.path);
      return `File deleted: ${args.path}`;
    }
    case 'search_files': {
      const files = await listFiles();
      const results: string[] = [];
      for (const file of files) {
        const content = await readFile(file);
        if (content.toLowerCase().includes(args.query.toLowerCase())) {
          results.push(file);
        }
      }
      return JSON.stringify(results);
    }
    default:
      return `Unknown tool: ${toolName}`;
  }
}

// ---------------------------------------------------------------------------
// Anthropic Claude (agentic tool loop)
// ---------------------------------------------------------------------------

async function handleAnthropic(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  sysPrompt: string,
): Promise<ChatResult> {
  let systemPrompt = sysPrompt;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anthropicMessages: any[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt = msg.content + '\n\n' + SYSTEM_PROMPT;
    } else {
      anthropicMessages.push({ role: msg.role, content: msg.content });
    }
  }

  const tools = toolsForAnthropic();
  const toolCalls: ToolCallRecord[] = [];
  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: anthropicMessages,
        tools,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(formatUpstreamError('Anthropic', res.status, text));
    }

    const data = await fetchJSON(res);

    if (data.stop_reason === 'tool_use') {
      anthropicMessages.push({ role: 'assistant', content: data.content });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolUseBlocks = data.content.filter((b: any) => b.type === 'tool_use');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolResults: any[] = [];

      for (const block of toolUseBlocks) {
        let result: string;
        try {
          result = await executeTool(block.name, block.input ?? {});
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
        toolCalls.push({ name: block.name, args: block.input ?? {}, result });
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
      }

      anthropicMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textBlock = data.content?.find((b: any) => b.type === 'text');
    return { message: textBlock?.text ?? 'No response from Claude', toolCalls };
  }

  return { message: 'Reached maximum tool call iterations.', toolCalls };
}

// ---------------------------------------------------------------------------
// OpenAI (agentic tool loop)
// ---------------------------------------------------------------------------

async function handleOpenAI(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  sysPrompt: string,
): Promise<ChatResult> {
  const tools = toolsForOpenAI();
  const toolCalls: ToolCallRecord[] = [];
  const MAX_ITERATIONS = 10;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openaiMessages: any[] = [{ role: 'system', content: sysPrompt }];

  for (const msg of messages) {
    if (msg.role === 'system') {
      openaiMessages[0].content = msg.content + '\n\n' + sysPrompt;
    } else {
      openaiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: openaiMessages, tools }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(formatUpstreamError('OpenAI', res.status, text));
    }

    const data = await fetchJSON(res);
    const choice = data.choices?.[0];
    if (!choice) throw new Error('No choices returned from OpenAI');

    if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls) {
      openaiMessages.push(choice.message);

      for (const tc of choice.message.tool_calls) {
        let args: Record<string, string> = {};
        try { args = JSON.parse(tc.function.arguments); } catch {}

        let result: string;
        try {
          result = await executeTool(tc.function.name, args);
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
        toolCalls.push({ name: tc.function.name, args, result });
        openaiMessages.push({ role: 'tool', tool_call_id: tc.id, content: result });
      }
      continue;
    }

    return { message: choice.message?.content ?? 'No response from OpenAI', toolCalls };
  }

  return { message: 'Reached maximum tool call iterations.', toolCalls };
}

// ---------------------------------------------------------------------------
// xAI Grok (OpenAI-compatible, agentic tool loop)
// ---------------------------------------------------------------------------

async function handleXAI(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  sysPrompt: string,
): Promise<ChatResult> {
  const tools = toolsForOpenAI();
  const toolCalls: ToolCallRecord[] = [];
  const MAX_ITERATIONS = 10;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xaiMessages: any[] = [{ role: 'system', content: sysPrompt }];

  for (const msg of messages) {
    if (msg.role === 'system') {
      xaiMessages[0].content = msg.content + '\n\n' + sysPrompt;
    } else {
      xaiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: xaiMessages, tools }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(formatUpstreamError('xAI', res.status, text));
    }

    const data = await fetchJSON(res);
    const choice = data.choices?.[0];
    if (!choice) throw new Error('No choices returned from xAI');

    if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls) {
      xaiMessages.push(choice.message);

      for (const tc of choice.message.tool_calls) {
        let args: Record<string, string> = {};
        try { args = JSON.parse(tc.function.arguments); } catch {}

        let result: string;
        try {
          result = await executeTool(tc.function.name, args);
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
        toolCalls.push({ name: tc.function.name, args, result });
        xaiMessages.push({ role: 'tool', tool_call_id: tc.id, content: result });
      }
      continue;
    }

    return { message: choice.message?.content ?? 'No response from Grok', toolCalls };
  }

  return { message: 'Reached maximum tool call iterations.', toolCalls };
}

// ---------------------------------------------------------------------------
// Ollama (OpenAI-compatible tool format, with graceful fallback)
// ---------------------------------------------------------------------------

async function handleOllama(
  messages: ChatMessage[],
  model: string,
  sysPrompt: string,
): Promise<ChatResult> {
  const tools = toolsForOpenAI();
  const toolCalls: ToolCallRecord[] = [];
  const MAX_ITERATIONS = 10;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ollamaMessages: any[] = [{ role: 'system', content: sysPrompt }];

  for (const msg of messages) {
    if (msg.role === 'system') {
      ollamaMessages[0].content = msg.content + '\n\n' + sysPrompt;
    } else {
      ollamaMessages.push({ role: msg.role, content: msg.content });
    }
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let res: Response;
    try {
      res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: ollamaMessages, tools, stream: false }),
      });
    } catch (err) {
      throw new Error(`Ollama connection error: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!res.ok) {
      if (i === 0) {
        const fallbackRes = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: ollamaMessages, stream: false }),
        });
        if (!fallbackRes.ok) {
          const text = await fallbackRes.text();
          throw new Error(formatUpstreamError('Ollama', fallbackRes.status, text));
        }
        const fallbackData = await fetchJSON(fallbackRes);
        return { message: fallbackData.message?.content ?? 'No response from Ollama', toolCalls: [] };
      }
      const text = await res.text();
      throw new Error(formatUpstreamError('Ollama', res.status, text));
    }

    const data = await fetchJSON(res);

    if (data.message?.tool_calls && data.message.tool_calls.length > 0) {
      ollamaMessages.push(data.message);

      for (const tc of data.message.tool_calls) {
        const funcName = tc.function?.name;
        const funcArgs = tc.function?.arguments ?? {};

        let result: string;
        try {
          result = await executeTool(funcName, funcArgs);
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
        toolCalls.push({ name: funcName, args: funcArgs, result });
        ollamaMessages.push({ role: 'tool', content: result });
      }
      continue;
    }

    return { message: data.message?.content ?? 'No response from Ollama', toolCalls };
  }

  return { message: 'Reached maximum tool call iterations.', toolCalls };
}

// ---------------------------------------------------------------------------
// Google Gemini (agentic tool loop)
// ---------------------------------------------------------------------------

async function handleGoogle(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  sysPrompt: string,
): Promise<ChatResult> {
  const tools = toolsForGemini();
  const toolCalls: ToolCallRecord[] = [];
  const MAX_ITERATIONS = 10;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents: any[] = [];
  for (const msg of messages) {
    if (msg.role === 'system') continue;
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sysPrompt }] },
          contents,
          tools,
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(formatUpstreamError('Gemini', res.status, text));
    }

    const data = await fetchJSON(res);
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('No candidates returned from Gemini');

    const parts = candidate.content?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const functionCalls = parts.filter((p: any) => p.functionCall);

    if (functionCalls.length > 0) {
      contents.push({ role: 'model', parts });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const functionResponses: any[] = [];
      for (const fc of functionCalls) {
        const name = fc.functionCall.name;
        const args = fc.functionCall.args ?? {};

        let result: string;
        try {
          result = await executeTool(name, args);
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }
        toolCalls.push({ name, args, result });
        functionResponses.push({ functionResponse: { name, response: { result } } });
      }

      contents.push({ role: 'user', parts: functionResponses });
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textPart = parts.find((p: any) => p.text);
    return { message: textPart?.text ?? 'No response from Gemini', toolCalls };
  }

  return { message: 'Reached maximum tool call iterations.', toolCalls };
}

// ---------------------------------------------------------------------------
// Main handler — exported for IPC registration
// ---------------------------------------------------------------------------

export async function handleChat(opts: ChatRequest): Promise<ChatResult> {
  const { messages, provider, model, apiKey, systemPrompt: customSystemPrompt } = opts;

  if (!messages || !provider || !model) {
    throw new Error('Missing required fields: messages, provider, model');
  }

  const sysPrompt = customSystemPrompt || SYSTEM_PROMPT;

  if (isByoAgentId(provider)) {
    return handleByoChat({
      messages,
      provider,
      systemPrompt: sysPrompt,
    });
  }

  if (provider === 'ollama') {
    return handleOllama(messages, model, sysPrompt);
  }

  if (provider === 'openai') {
    if (!apiKey) throw new Error('OpenAI API key is required. Add it in Settings > AI & Models.');
    return handleOpenAI(messages, model, apiKey, sysPrompt);
  }

  if (provider === 'anthropic') {
    if (!apiKey) throw new Error('Anthropic API key is required. Add it in Settings > AI & Models.');
    return handleAnthropic(messages, model, apiKey, sysPrompt);
  }

  if (provider === 'google') {
    if (!apiKey) throw new Error('Google API key is required. Add it in Settings > AI & Models.');
    return handleGoogle(messages, model, apiKey, sysPrompt);
  }

  if (provider === 'xai') {
    if (!apiKey) throw new Error('xAI API key is required. Add it in Settings > AI & Models.');
    return handleXAI(messages, model, apiKey, sysPrompt);
  }

  throw new Error(`Unknown provider: ${provider}`);
}
