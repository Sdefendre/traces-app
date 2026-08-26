import { useEffect } from 'react';
import { registerTracesAppWebMcp } from '@/lib/webmcp';

/**
 * Feature-detect WebMCP and register in-app tools for the life of the app shell.
 * No-ops when document.modelContext is missing.
 */
export function useWebMcpTools() {
  useEffect(() => registerTracesAppWebMcp(), []);
}
