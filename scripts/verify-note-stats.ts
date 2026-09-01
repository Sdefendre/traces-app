/**
 * The editor footer word count must count prose, not markdown punctuation.
 * Headings, list bullets, code fences, and link syntax should never inflate it.
 */
import assert from 'node:assert/strict';
import { countWords, computeNoteStats } from '../src/lib/note-stats';

assert.equal(countWords(''), 0);
assert.equal(countWords('   \n\n  '), 0);
assert.equal(countWords('hello world'), 2);
assert.equal(countWords('# Heading\n\nSome text here.'), 4, 'heading marker is not a word');
assert.equal(countWords('- one\n- two\n* three\n1. four\n2) five'), 5, 'list markers are not words');
assert.equal(countWords('> quoted line'), 2, 'blockquote marker is not a word');
assert.equal(countWords('**bold** and _italic_ and ~~struck~~'), 5);
assert.equal(countWords('inline `code` here'), 3);
assert.equal(countWords('before\n```ts\nconst x = 1;\nconst y = 2;\n```\nafter'), 2, 'fenced code is skipped');
assert.equal(countWords('start\n```\nunterminated fence'), 1, 'an unterminated fence swallows the rest');
assert.equal(countWords('See [[Architecture]] now'), 3, 'wiki-link target counts as its words');
assert.equal(countWords('See [[Architecture|the design]] now'), 4, 'wiki-link alias counts instead of target');
assert.equal(countWords('A [link text](https://example.com/very/long) here'), 4, 'link URL is not counted');
assert.equal(countWords('![alt text](image.png)'), 2, 'image URL is not counted');
assert.equal(countWords('--- *** ___'), 0, 'punctuation-only tokens do not count');
assert.equal(countWords('café naïve 東京 2026'), 4, 'unicode letters and digits count');

assert.deepEqual(computeNoteStats(''), { words: 0, characters: 0, lines: 0, readingTime: 0 });
assert.deepEqual(computeNoteStats('one two'), { words: 2, characters: 7, lines: 1, readingTime: 1 });
assert.equal(computeNoteStats('a\nb\nc').lines, 3);
assert.equal(computeNoteStats('a\nb\n').lines, 3, 'trailing newline counts as an empty last line');

const longNote = Array.from({ length: 450 }, () => 'word').join(' ');
assert.equal(computeNoteStats(longNote).readingTime, 3, '450 words at 200 wpm rounds up to 3 minutes');
assert.equal(computeNoteStats('just a few words').readingTime, 1, 'any prose is at least a 1 minute read');

console.log('note-stats verification passed');
