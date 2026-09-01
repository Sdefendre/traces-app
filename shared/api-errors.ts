/**
 * Turn an upstream HTTP failure into a sentence a user can act on,
 * instead of surfacing `Service error (401): {"error":{...}}` verbatim.
 */
export function formatUpstreamError(service: string, status: number, body: string): string {
  const detail = extractErrorMessage(body);
  const hint = statusHint(status);
  const parts = [`${service} request failed (${status}).`];
  if (detail) parts.push(detail.endsWith('.') ? detail : `${detail}.`);
  if (hint) parts.push(hint);
  return parts.join(' ');
}

/** Pull the human-readable message out of a JSON error body; falls back to trimmed plain text. */
export function extractErrorMessage(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return truncate(trimmed);

  try {
    const parsed: unknown = JSON.parse(trimmed);
    const message = findMessage(parsed);
    return message ? truncate(message) : '';
  } catch {
    return truncate(trimmed);
  }
}

function findMessage(value: unknown, depth = 0): string | null {
  if (depth > 4 || value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  for (const key of ['error', 'message', 'detail', 'error_description']) {
    if (key in record) {
      const found = findMessage(record[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function statusHint(status: number): string {
  if (status === 401 || status === 403) return 'Check that the API key in Settings > AI & Models is correct.';
  if (status === 429) return 'You are being rate limited — wait a moment and try again.';
  if (status >= 500) return 'The provider is having trouble; try again shortly.';
  return '';
}

function truncate(text: string, max = 240): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
