import { useEditorStore } from '@/stores/editor-store';
import { useUIStore } from '@/stores/ui-store';
import { useVaultStore } from '@/stores/vault-store';
import { matchNotePaths, resolveNotePath } from '@/lib/webmcp-notes';

export { matchNotePaths, resolveNotePath } from '@/lib/webmcp-notes';

export const SEARCH_NOTES_EVENT = 'traces:search-notes';

function getModelContext(): WebMCP.ModelContext | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.modelContext;
}

function throwIfAborted(signal: AbortSignal) {
  if (typeof signal.throwIfAborted === 'function') {
    signal.throwIfAborted();
    return;
  }
  if (signal.aborted) {
    throw signal.reason ?? new Error('The WebMCP tool call was cancelled.');
  }
}

function readQuery(input: Record<string, unknown>): string {
  return typeof input.query === 'string' ? input.query : '';
}

function readPath(input: Record<string, unknown>): string {
  return typeof input.path === 'string' ? input.path : '';
}

function revealSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore.getState();
  if (sidebarCollapsed) toggleSidebar();
}

function applySearchToFileTree(query: string) {
  revealSidebar();
  window.dispatchEvent(new CustomEvent(SEARCH_NOTES_EVENT, { detail: { query } }));
}

async function openExistingNote(path: string) {
  useVaultStore.getState().setActiveFile(path);
  await useEditorStore.getState().openFile(path);
  const { editorCollapsed, setEditorCollapsed } = useUIStore.getState();
  if (editorCollapsed) setEditorCollapsed(false);
}

async function registerAppTools(
  modelContext: WebMCP.ModelContext,
  signal: AbortSignal
) {
  await modelContext.registerTool(
    {
      name: 'search-notes',
      title: 'Search notes',
      description:
        'Search the open local vault by file path or note name. Returns matching paths only. Does not return note bodies and does not upload the vault.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Substring to match against vault-relative paths and note names.',
          },
        },
        required: ['query'],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, { signal: executeSignal }) => {
        throwIfAborted(executeSignal);
        const query = readQuery(input);
        if (!query.trim()) {
          return { query, matches: [], count: 0, reason: 'Provide a search query.' };
        }

        const matches = matchNotePaths(useVaultStore.getState().files, query);
        throwIfAborted(executeSignal);
        applySearchToFileTree(query);
        return { query, matches, count: matches.length };
      },
    },
    { signal }
  );

  await modelContext.registerTool(
    {
      name: 'open-note',
      title: 'Open a note',
      description:
        'Open an existing note in the local editor by vault-relative path or unique note name. Does not create notes or return note bodies.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Vault-relative path (for example Memory/Index.md) or a unique note name.',
          },
        },
        required: ['path'],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input, { signal: executeSignal }) => {
        throwIfAborted(executeSignal);
        const requested = readPath(input);
        const resolved = resolveNotePath(useVaultStore.getState().files, requested);
        if (!resolved.path) {
          return {
            opened: false,
            path: requested,
            candidates: resolved.candidates,
            reason:
              resolved.candidates.length > 1
                ? 'Several notes share that name. Pass a full vault-relative path.'
                : 'No matching note in the open local vault.',
          };
        }

        throwIfAborted(executeSignal);
        await openExistingNote(resolved.path);
        throwIfAborted(executeSignal);
        return { opened: true, path: resolved.path };
      },
    },
    { signal }
  );
}

/**
 * Register in-app WebMCP tools when document.modelContext exists.
 * Returns an unregister function. Missing API is a no-op.
 */
export function registerTracesAppWebMcp(): () => void {
  const modelContext = getModelContext();
  if (!modelContext) return () => {};

  const controller = new AbortController();

  void registerAppTools(modelContext, controller.signal).catch((error: unknown) => {
    if (controller.signal.aborted) return;
    console.warn('WebMCP registration skipped.', error);
  });

  return () => {
    if (!controller.signal.aborted) controller.abort();
  };
}
