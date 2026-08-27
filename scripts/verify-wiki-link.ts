/**
 * Wiki-link aliases must resolve to the note name, not the display label.
 * Preview and click-to-open share this helper so [[Note|label]] works.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseWikiLink, applyWikiLinks } from '../src/lib/wiki-link';
import { resolveNotePath } from '../src/lib/webmcp-notes';

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

const previewSource = readFileSync(
  path.join(root, 'src/components/editor/MarkdownPreview.tsx'),
  'utf8'
);
assert.match(
  previewSource,
  /applyWikiLinks/,
  'Preview must use applyWikiLinks so aliases do not become the click target'
);

const editorSource = readFileSync(
  path.join(root, 'src/components/editor/EditorPanel.tsx'),
  'utf8'
);
assert.match(
  editorSource,
  /resolveNotePath/,
  'Editor wiki-link clicks must use resolveNotePath'
);
assert.match(
  editorSource,
  /parseWikiLink/,
  'Editor wiki-link clicks must parse aliases before resolving'
);

console.log('wiki-link verification passed');
