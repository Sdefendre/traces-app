/**
 * Wiki-link aliases must resolve to the note name, not the display label.
 * Preview and click-to-open share this helper so [[Note|label]] works.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseWikiLink, applyWikiLinks } from '../src/lib/wiki-link';
import { resolveNotePath } from '../src/lib/webmcp-notes';
import { resolveWikiLink as resolveWikiLinkPath, sanitizeNoteTitle } from '../src/lib/wiki-links';

function repoRoot(start: string): string {
  let dir = start;
  while (true) {
    if (existsSync(path.join(dir, 'package.json')) && existsSync(path.join(dir, 'src'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('Could not find the traces-app repo root');
    dir = parent;
  }
}

const root = repoRoot(__dirname);

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function resolveWikiLink(files: string[], raw: string) {
  const { target } = parseWikiLink(raw);
  return resolveNotePath(files, target);
}

assert.deepEqual(parseWikiLink('Architecture'), {
  target: 'Architecture',
  display: 'Architecture',
});
assert.deepEqual(parseWikiLink('Architecture|the architecture'), {
  target: 'Architecture',
  display: 'the architecture',
});
assert.deepEqual(parseWikiLink('  Foo | Bar  '), {
  target: 'Foo',
  display: 'Bar',
});
assert.deepEqual(parseWikiLink('Foo|'), {
  target: 'Foo',
  display: 'Foo',
});

const files = ['Memory/Architecture.md', 'Projects/Traces.md'];
assert.equal(
  resolveWikiLink(files, 'Architecture|the architecture').path,
  'Memory/Architecture.md'
);
assert.equal(resolveWikiLink(files, 'Traces').path, 'Projects/Traces.md');
assert.equal(resolveWikiLink(files, 'Projects/Traces.md').path, 'Projects/Traces.md');

const aliased = applyWikiLinks('See [[Architecture|the architecture]].', escapeAttr);
assert.match(aliased, /data-wiki-target="Architecture"/);
assert.match(aliased, />the architecture<\/a>/);
assert.equal(aliased.includes('Architecture|the architecture'), false);

const quoted = applyWikiLinks('[[Note "one"|label]]', escapeAttr);
assert.match(quoted, /data-wiki-target="Note &quot;one&quot;"/);

// resolveWikiLink (src/lib/wiki-links.ts) is what the editor click handler and the
// preview use. It must honour aliases, be case-insensitive, and never return a
// duplicate-creating null when the name is merely ambiguous.
assert.equal(resolveWikiLinkPath(files, 'Architecture|the architecture'), 'Memory/Architecture.md');
assert.equal(resolveWikiLinkPath(files, 'architecture'), 'Memory/Architecture.md');
assert.equal(resolveWikiLinkPath(files, 'Projects/Traces.md'), 'Projects/Traces.md');
assert.equal(resolveWikiLinkPath(files, 'Missing Note'), null);
assert.equal(resolveWikiLinkPath(files, '   '), null);
const ambiguous = ['A/Index.md', 'B/Index.md'];
assert.equal(
  resolveWikiLinkPath(ambiguous, 'Index'),
  'A/Index.md',
  'Ambiguous names open the first candidate instead of creating a third note'
);

assert.equal(sanitizeNoteTitle('Missing Note'), 'Missing Note');
assert.equal(sanitizeNoteTitle('Bad:/name?|alias text'), 'Badname');
assert.equal(sanitizeNoteTitle('***'), '', 'a title made only of illegal characters is rejected');

const previewSource = readFileSync(
  path.join(root, 'src/components/editor/MarkdownPreview.tsx'),
  'utf8'
);
assert.match(
  previewSource,
  /parseWikiLink/,
  'Preview must use parseWikiLink so aliases do not become the click target'
);
assert.match(
  previewSource,
  /is-unresolved/,
  'Preview must mark links to missing notes so users can tell them apart'
);

const editorSource = readFileSync(
  path.join(root, 'src/components/editor/EditorPanel.tsx'),
  'utf8'
);
assert.match(
  editorSource,
  /resolveWikiLink/,
  'Editor wiki-link clicks must resolve through the shared helper'
);
assert.match(
  editorSource,
  /sanitizeNoteTitle/,
  'Editor must sanitize the link target before creating a missing note'
);

const widgetSource = readFileSync(
  path.join(root, 'src/components/editor/extensions/wikiLink.ts'),
  'utf8'
);
assert.match(widgetSource, /is-unresolved/, 'Editor widget must mark unresolved links');

console.log('wiki-link verification passed');
