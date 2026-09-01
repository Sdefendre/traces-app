export interface NoteStats {
  words: number;
  characters: number;
  lines: number;
  readingTime: number;
}

const WORDS_PER_MINUTE = 200;

/**
 * Count prose words in a markdown document.
 * Fenced code is skipped and markdown punctuation (#, -, >, **, backticks, link syntax)
 * is removed before counting, so only tokens containing a letter or digit count.
 */
export function countWords(markdown: string): number {
  const prose = markdown
    .replace(/```[\s\S]*?(?:```|$)/g, ' ')
    .replace(/^[ \t]{0,3}(?:#{1,6}|>|[-*+]|\d+[.)])[ \t]+/gm, '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target: string, alias?: string) => alias ?? target)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '');

  return prose.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

export function computeNoteStats(text: string): NoteStats {
  const words = countWords(text);
  const characters = text.length;
  const lines = text === '' ? 0 : text.split('\n').length;
  const readingTime = words === 0 ? 0 : Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return { words, characters, lines, readingTime };
}
