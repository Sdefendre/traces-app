import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Provider = 'ollama' | 'openai' | 'anthropic' | 'xai';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  provider: Provider;
  model: string;
  apiKey?: string;
  vaultPath?: string;
}

interface ToolCallRecord {
  name: string;
  args: Record<string, string>;
  result: string;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'list_files',
    description: 'List all files in the current vault',
    parameters: {},
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    parameters: { path: 'string - the file path relative to vault root' },
  },
  {
    name: 'write_file',
    description: 'Write or create a file with given content',
    parameters: { path: 'string', content: 'string' },
  },
  {
    name: 'edit_file',
    description: 'Edit a file by replacing old text with new text',
    parameters: { path: 'string', old_text: 'string', new_text: 'string' },
  },
  {
    name: 'delete_file',
    description: 'Delete a file',
    parameters: { path: 'string' },
  },
  {
    name: 'search_files',
    description: 'Search for text across all files in the vault',
    parameters: { query: 'string' },
  },
] as const;

// ---------------------------------------------------------------------------
// System prompt for all providers
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  'You are Traces, an AI assistant embedded in a knowledge management app called Traces. ' +
  'You can read, write, edit, search, and delete files in the user\'s vault. ' +
  'Use tools to help the user manage their notes and knowledge base. ' +
  'Always be helpful and proactive.';

// ---------------------------------------------------------------------------
// Convert tools to provider-specific formats
// ---------------------------------------------------------------------------

function toolsForOpenAI() {
  return [
    {
      type: 'function' as const,
      function: {
        name: 'list_files',
        description: 'List all files in the current vault',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'read_file',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'The file path relative to vault root' },
          },
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
          properties: {
            path: { type: 'string', description: 'The file path relative to vault root' },
          },
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
          properties: {
            query: { type: 'string', description: 'The search query' },
          },
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
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [] as string[],
      },
    },
    {
      name: 'read_file',
      description: 'Read the contents of a file',
      input_schema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string', description: 'The file path relative to vault root' },
        },
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
        properties: {
          path: { type: 'string', description: 'The file path relative to vault root' },
        },
        required: ['path'],
      },
    },
    {
      name: 'search_files',
      description: 'Search for text across all files in the vault',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'The search query' },
        },
        required: ['query'],
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// File system helpers
// ---------------------------------------------------------------------------

function safePath(vaultRoot: string, filePath: string): string {
  const resolved = path.resolve(vaultRoot, filePath);
  if (!resolved.startsWith(path.resolve(vaultRoot))) {
    throw new Error('Path traversal not allowed');
  }
  return resolved;
}

async function listFilesRecursive(dir: string, base?: string): Promise<string[]> {
  const root = base ?? dir;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip hidden directories like .obsidian, .git, .trash, etc.
      if (entry.name.startsWith('.')) continue;
      const sub = await listFilesRecursive(fullPath, root);
      files.push(...sub);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(path.relative(root, fullPath));
    }
  }

  return files;
}

async function executeTool(
  toolName: string,
  args: Record<string, string>,
  vaultRoot: string,
): Promise<string> {
  switch (toolName) {
    case 'list_files': {
      const files = await listFilesRecursive(vaultRoot);
      return JSON.stringify(files);
    }
    case 'read_file': {
      const fullPath = safePath(vaultRoot, args.path);
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    }
    case 'write_file': {
      const fullPath = safePath(vaultRoot, args.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, args.content, 'utf-8');
      return `File written: ${args.path}`;
    }
    case 'edit_file': {
      const fullPath = safePath(vaultRoot, args.path);
      let content = await fs.readFile(fullPath, 'utf-8');
      if (!content.includes(args.old_text)) {
        return `Error: Could not find the specified text in ${args.path}`;
      }
      content = content.replace(args.old_text, args.new_text);
      await fs.writeFile(fullPath, content, 'utf-8');
      return `File edited: ${args.path}`;
    }
    case 'delete_file': {
      const fullPath = safePath(vaultRoot, args.path);
      await fs.unlink(fullPath);
      return `File deleted: ${args.path}`;
    }
    case 'search_files': {
      const files = await listFilesRecursive(vaultRoot);
      const results: string[] = [];
      for (const file of files) {
        const fullPath = path.join(vaultRoot, file);
        const content = await fs.readFile(fullPath, 'utf-8');
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
// Anthropic Claude  (agentic tool loop)
// ---------------------------------------------------------------------------

async function handleAnthropic(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  vaultRoot: string,
): Promise<{ message: string; toolCalls: ToolCallRecord[] }> {
  // Separate system prompt; Anthropic only accepts user / assistant roles.
  let systemPrompt = SYSTEM_PROMPT;
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
    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
      tools,
    };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic error (${res.status}): ${text}`);
    }

    const data = await res.json();

    // Check if the model wants to use tools
    if (data.stop_reason === 'tool_use') {
      // Append the full assistant response (which includes text + tool_use blocks)
      anthropicMessages.push({ role: 'assistant', content: data.content });

      // Process each tool_use block
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolUseBlocks = data.content.filter((b: any) => b.type === 'tool_use');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolResults: any[] = [];

      for (const block of toolUseBlocks) {
        let result: string;
        try {
          result = await executeTool(block.name, block.input ?? {}, vaultRoot);
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }

        toolCalls.push({ name: block.name, args: block.input ?? {}, result });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }

      anthropicMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    // No more tool calls -- extract final text
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textBlock = data.content?.find((b: any) => b.type === 'text');
    return {
      message: textBlock?.text ?? 'No response from Claude',
      toolCalls,
    };
  }

  // If we hit max iterations, return whatever we have
  return {
    message: 'Reached maximum tool call iterations. Please try again with a simpler request.',
    toolCalls,
  };
}

// ---------------------------------------------------------------------------
// OpenAI  (agentic tool loop)
// ---------------------------------------------------------------------------

async function handleOpenAI(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  vaultRoot: string,
): Promise<{ message: string; toolCalls: ToolCallRecord[] }> {
  const tools = toolsForOpenAI();
  const toolCalls: ToolCallRecord[] = [];
  const MAX_ITERATIONS = 10;

  // Build the message array with our system prompt prepended
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openaiMessages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Merge user-provided system prompt into the first system message
      openaiMessages[0].content = msg.content + '\n\n' + SYSTEM_PROMPT;
    } else {
      openaiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages: openaiMessages, tools }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI error (${res.status}): ${text}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error('No choices returned from OpenAI');
    }

    if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls) {
      // Append the assistant message with tool_calls
      openaiMessages.push(choice.message);

      // Execute each tool call and append results
      for (const tc of choice.message.tool_calls) {
        let args: Record<string, string> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          // If parsing fails, use empty args
        }

        let result: string;
        try {
          result = await executeTool(tc.function.name, args, vaultRoot);
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }

        toolCalls.push({ name: tc.function.name, args, result });

        openaiMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }

      continue;
    }

    // Final text response
    return {
      message: choice.message?.content ?? 'No response from OpenAI',
      toolCalls,
    };
  }

  return {
    message: 'Reached maximum tool call iterations. Please try again with a simpler request.',
    toolCalls,
  };
}

// ---------------------------------------------------------------------------
// xAI Grok  (OpenAI-compatible, agentic tool loop)
// ---------------------------------------------------------------------------

async function handleXAI(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  vaultRoot: string,
): Promise<{ message: string; toolCalls: ToolCallRecord[] }> {
  const tools = toolsForOpenAI();
  const toolCalls: ToolCallRecord[] = [];
  const MAX_ITERATIONS = 10;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xaiMessages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  for (const msg of messages) {
    if (msg.role === 'system') {
      xaiMessages[0].content = msg.content + '\n\n' + SYSTEM_PROMPT;
    } else {
      xaiMessages.push({ role: msg.role, content: msg.content });
    }
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages: xaiMessages, tools }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`xAI error (${res.status}): ${text}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error('No choices returned from xAI');
    }

    if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls) {
      xaiMessages.push(choice.message);

      for (const tc of choice.message.tool_calls) {
        let args: Record<string, string> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          // If parsing fails, use empty args
        }

        let result: string;
        try {
          result = await executeTool(tc.function.name, args, vaultRoot);
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }

        toolCalls.push({ name: tc.function.name, args, result });

        xaiMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }

      continue;
    }

    return {
      message: choice.message?.content ?? 'No response from Grok',
      toolCalls,
    };
  }

  return {
    message: 'Reached maximum tool call iterations. Please try again with a simpler request.',
    toolCalls,
  };
}

// ---------------------------------------------------------------------------
// Ollama  (OpenAI-compatible tool format, with graceful fallback)
// ---------------------------------------------------------------------------

async function handleOllama(
  messages: ChatMessage[],
  model: string,
  vaultRoot: string,
): Promise<{ message: string; toolCalls: ToolCallRecord[] }> {
  const tools = toolsForOpenAI();
  const toolCalls: ToolCallRecord[] = [];
  const MAX_ITERATIONS = 10;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ollamaMessages: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  for (const msg of messages) {
    if (msg.role === 'system') {
      ollamaMessages[0].content = msg.content + '\n\n' + SYSTEM_PROMPT;
    } else {
      ollamaMessages.push({ role: msg.role, content: msg.content });
    }
  }

  // First, try with tools. If the model doesn't support tools, fall back.
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let res: Response;
    try {
      res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: ollamaMessages,
          tools: i === 0 ? tools : tools, // Always send tools
          stream: false,
        }),
      });
    } catch (err) {
      throw new Error(`Ollama connection error: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!res.ok) {
      // If tools caused an error on the first attempt, retry without tools
      if (i === 0) {
        const fallbackRes = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: ollamaMessages, stream: false }),
        });

        if (!fallbackRes.ok) {
          const text = await fallbackRes.text();
          throw new Error(`Ollama error (${fallbackRes.status}): ${text}`);
        }

        const fallbackData = await fallbackRes.json();
        return {
          message: fallbackData.message?.content ?? 'No response from Ollama',
          toolCalls: [],
        };
      }

      const text = await res.text();
      throw new Error(`Ollama error (${res.status}): ${text}`);
    }

    const data = await res.json();

    // Ollama returns tool_calls in the message if the model supports function calling
    if (data.message?.tool_calls && data.message.tool_calls.length > 0) {
      // Append assistant message with tool calls
      ollamaMessages.push(data.message);

      for (const tc of data.message.tool_calls) {
        const funcName = tc.function?.name;
        const funcArgs = tc.function?.arguments ?? {};

        let result: string;
        try {
          result = await executeTool(funcName, funcArgs, vaultRoot);
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }

        toolCalls.push({ name: funcName, args: funcArgs, result });

        ollamaMessages.push({
          role: 'tool',
          content: result,
        });
      }

      continue;
    }

    // No tool calls -- return final text
    return {
      message: data.message?.content ?? 'No response from Ollama',
      toolCalls,
    };
  }

  return {
    message: 'Reached maximum tool call iterations. Please try again with a simpler request.',
    toolCalls,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const { messages, provider, model, apiKey, vaultPath } =
      (await req.json()) as ChatRequest;

    if (!messages || !provider || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: messages, provider, model' },
        { status: 400 },
      );
    }

    const vaultRoot =
      vaultPath ||
      process.env.VAULT_PATH ||
      path.join(process.env.HOME || '', 'Desktop/Traces Notes');

    // ----- Ollama (no key needed) -----
    if (provider === 'ollama') {
      const result = await handleOllama(messages, model, vaultRoot);
      return NextResponse.json(result);
    }

    // ----- OpenAI -----
    if (provider === 'openai') {
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured. Set OPENAI_API_KEY in .env.local or pass apiKey.' },
          { status: 503 },
        );
      }
      const result = await handleOpenAI(messages, model, key, vaultRoot);
      return NextResponse.json(result);
    }

    // ----- Anthropic -----
    if (provider === 'anthropic') {
      const key = apiKey || process.env.ANTHROPIC_API_KEY;
      if (!key) {
        return NextResponse.json(
          { error: 'Anthropic API key not configured. Set ANTHROPIC_API_KEY in .env.local or pass apiKey.' },
          { status: 503 },
        );
      }
      const result = await handleAnthropic(messages, model, key, vaultRoot);
      return NextResponse.json(result);
    }

    // ----- xAI Grok -----
    if (provider === 'xai') {
      const key = apiKey || process.env.XAI_API_KEY;
      if (!key) {
        return NextResponse.json(
          { error: 'xAI API key not configured. Set XAI_API_KEY in .env.local or pass apiKey.' },
          { status: 503 },
        );
      }
      const result = await handleXAI(messages, model, key, vaultRoot);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: `Unknown provider: ${provider}` },
      { status: 400 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to process request';
    console.error('[chat route]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
