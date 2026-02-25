/**
 * Tool definitions for the OpenAI Realtime API.
 * Flat format (not nested like Chat Completions).
 */
export const REALTIME_TOOLS = [
  {
    type: 'function' as const,
    name: 'list_files',
    description: 'List all markdown files in the current vault',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    type: 'function' as const,
    name: 'read_file',
    description: 'Read the contents of a file in the vault',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to vault root' },
      },
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
      properties: {
        path: { type: 'string', description: 'File path relative to vault root' },
      },
      required: ['path'],
    },
  },
  {
    type: 'function' as const,
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
  {
    type: 'function' as const,
    name: 'list_voices',
    description: 'List the available voices for the current voice provider. Use this when the user asks what voices you have, what voice options are available, or similar.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    type: 'function' as const,
    name: 'change_voice',
    description: 'Change your voice to a different one. Use when the user asks you to change your voice, sound different, or switch to another voice. Call list_voices first if you need to know the available options.',
    parameters: {
      type: 'object',
      properties: {
        voice: { type: 'string', description: 'The voice name to switch to (must be one of the available voices from list_voices)' },
      },
      required: ['voice'],
    },
  },
];
