/**
 * Replace every exact copy of `oldText` with `newText`.
 * An empty search is refused. Dollar signs in the replacement are kept as typed.
 */
export function replaceAllLiteral(
  content: string,
  oldText: string,
  newText: string
): string | null {
  if (!oldText) return null;
  if (!content.includes(oldText)) return null;
  return content.split(oldText).join(newText);
}
