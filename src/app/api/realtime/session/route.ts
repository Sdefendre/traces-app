import { NextResponse } from 'next/server';

const REALTIME_TOOLS = [
  {
    type: 'function' as const,
    name: 'list_files',
    description: 'List all markdown files in the current vault',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function' as const,
    name: 'read_file',
    description: 'Read the contents of a file in the vault',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'File path relative to vault root' } },
      required: ['path'],
    },
  },
  {
    type: 'function' as const,
    name: 'write_file',
    description: 'Write or create a file with given content',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to vault root' },
        content: { type: 'string', description: 'The content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    type: 'function' as const,
    name: 'edit_file',
    description: 'Edit a file by replacing old text with new text',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to vault root' },
        old_text: { type: 'string', description: 'The text to find and replace' },
        new_text: { type: 'string', description: 'The replacement text' },
      },
      required: ['path', 'old_text', 'new_text'],
    },
  },
  {
    type: 'function' as const,
    name: 'delete_file',
    description: 'Delete a file from the vault',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: 'File path relative to vault root' } },
      required: ['path'],
    },
  },
  {
    type: 'function' as const,
    name: 'search_files',
    description: 'Search for text across all files in the vault',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'The search query' } },
      required: ['query'],
    },
  },
  {
    type: 'function' as const,
    name: 'list_voices',
    description: 'List the available voices for the current voice provider. Use when the user asks what voices you have or what options are available.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function' as const,
    name: 'change_voice',
    description: 'Change your voice. Use when the user asks you to change your voice. Call list_voices first to see available options.',
    parameters: {
      type: 'object',
      properties: { voice: { type: 'string', description: 'Voice name from list_voices' } },
      required: ['voice'],
    },
  },
];

export async function POST(req: Request) {
  const body = await req.json();
  const { apiKey, voice, instructions } = body as {
    apiKey?: string;
    voice?: string;
    instructions?: string;
  };

  const key = (apiKey && apiKey.trim()) || process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'OpenAI API key is required' },
      { status: 400 }
    );
  }

  const sessionConfig = {
    session: {
      type: 'realtime' as const,
      model: 'gpt-realtime',
      audio: {
        output: { voice: voice || 'verse' },
        input: {
          transcription: { model: 'gpt-4o-mini-transcribe' },
        },
      },
      tools: REALTIME_TOOLS,
      ...(instructions ? { instructions } : {}),
    },
  };

  const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sessionConfig),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `OpenAI error (${res.status}): ${text}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json({
    clientSecret: data.value,
    sessionId: data.session?.id ?? '',
  });
}
