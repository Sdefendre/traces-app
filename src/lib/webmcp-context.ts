/**
 * Find a usable WebMCP model context.
 *
 * The 26 August 2026 draft puts the API on document.modelContext.
 * Some older builds used navigator.modelContext instead, so we accept that
 * as a fallback. We only treat the object as real if registerTool exists.
 */
export interface ModelContextHost<T = unknown> {
  readonly modelContext?: T;
}

export function resolveModelContext<T>(
  documentLike?: ModelContextHost<T> | null,
  navigatorLike?: ModelContextHost<T> | null
): T | undefined {
  const candidate = documentLike?.modelContext || navigatorLike?.modelContext;
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    !('registerTool' in candidate) ||
    typeof candidate.registerTool !== 'function'
  ) {
    return undefined;
  }

  return candidate;
}
