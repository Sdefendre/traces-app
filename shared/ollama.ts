export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

/** Normalize an Ollama base URL (strip trailing slashes and require http(s)). */
export function normalizeOllamaEndpoint(raw?: string): string {
  const trimmed = (raw ?? '').trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_OLLAMA_ENDPOINT;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid Ollama endpoint URL: "${trimmed}"`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Invalid Ollama endpoint protocol: "${parsed.protocol}". Use http:// or https://.`,
    );
  }
  return trimmed;
}
