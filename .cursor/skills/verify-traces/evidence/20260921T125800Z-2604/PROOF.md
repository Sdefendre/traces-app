# verify-traces maintain pass, 2026-09-21

Outcome: changed. Base `main` at `774353c`. Every edit is under `.cursor/skills/verify-traces/`. No product code touched.

## Instance

- Isolated launch via `helpers/launch.sh`: fake `HOME` under `/tmp/traces-verify-20260921T125800Z-2604`, Next on 3333, CDP 9333, `DISPLAY=:1` (Xtigervnc on this VM).
- `pnpm install` on pnpm 10 skipped Electron's postinstall; `node node_modules/electron/install.js` fixed it, as the skill says. Not a product change.
- `~/Desktop` did not exist before, during, or after, so the real vault was never created.
- Doctor OK at `doctor-1.txt` (before the first drive) and `doctor-final.txt` (before teardown). No drive command failed, so no mid-run doctor was needed.
- Cleanup ran once. It removed the scratch dir, left this directory in place (61 files), and left no `electron .` or `next dev` process or listener on 3333/9333.

## Coverage

Each feature file was read from source by one read-only subagent and every feature was driven live at least once. Per-feature details are in `*/ENTRY.txt`.

- notes-editor: all 17 sub-feature ids. Create from Files header / Control+N / empty-editor header `New note`, Escape cancel, autosave to disk, status bar before and after an edit, `.cm-line:last-child` append, preview, light/dark toggle, wiki-link follow, alias (targeted anchor), ambiguous fill, unresolved create, heading rename, right-click Delete with confirm, close every tab, `Collapse notes` and Control+3, `Open AI Chat` and Control+4, Control+N with Files collapsed.
- search: all 6 sub-feature ids. Click focus, Control+F with Files expanded and collapsed, `alpha` / `SUB/` / `volcano` filters, `Clear search` button, open Alpha from the filtered tree.
- graph: all 11 sub-feature ids. Galaxy, Terrain, Cluster, Particle, five shapes, zoom, fullscreen via button / Escape / Control+\ / `Exit fullscreen`, collapse via button and Control+2, Settings hides the graph and exposes `Low Power Mode`, empty-vault overlay and its `New Note`.
- pages-site: `pages-check.sh` exit 0; extra needles for principles, CTAs, and feature kickers present; live HTML byte-identical to `docs/index.html`.

## Drift fixed in this PR

1. Heading rename condition. Source `src/components/editor/MarkdownEditor.tsx:26` matches `/^#\s+(.+)/m`, the first `# ` line anywhere. The map said the first line had to stay a heading and that gluing text onto it disabled rename for the note. Proven wrong: `notes-editor/renamed-from-later-heading.*`.
2. New note location. `Close tab` never calls `setActiveFile(null)` (only delete and the file watcher do, `src/components/sidebar/FileTree.tsx:110-112`, `src/components/layout/AppShell.tsx:149-151`), so a create with zero tabs open still lands beside the last opened note. The map said vault root. Proven: `notes-editor/created-from-empty-editor.*`.
3. Alias selector. `a.md-wiki-link[data-wiki-target="Verify Beta"]` hits the plain link when the note has both; recipe now names the alias anchor.
4. Empty-vault button attribution in SKILL.md, the search gap's HEAD hash, and the graph cold-click note's date.

## Harness fix proven live

- `drive.mjs type` with a locator inside CodeMirror now clicks the line's right edge (last wrapped row). With main's center click, `type --selector ".cm-line:last-child"` split `Gamma body from verify-traces` into `verify-tra` / `ces`. After the fix the same command appended a new last line. Both states are in `notes-editor/append-after-fix.md`: lines 3-5 carry the split from the broken click, line 6 is the append from the fixed one.

## Product gaps, not edited

1. Control+F and Control+N do nothing while Files is collapsed. Unchanged at `774353c`: `AppShell.tsx:98-105` dispatches, `FileTree.tsx:22-57` listens, `AppShell.tsx:342-353` unmounts `FileTree` when collapsed. Screenshots: `search/collapsed-ctrl-f.png`, `notes-editor/collapsed-ctrl-n-no-expand.png`.
2. `docs/webmcp.js:41` answers `Node 18+`; `docs/index.html:210` says Node 22. Live asset saved at `pages/webmcp.js`.
