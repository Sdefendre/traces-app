# verify-traces maintain pass, 2026-09-14

Outcome: changed. Base `main` at `a48ec9b`. Every edit is under `.cursor/skills/verify-traces/`. No product code touched.

## Instance

- Isolated launch via `helpers/launch.sh`: fake `HOME` under `/tmp/traces-verify-20260914T125158Z-3147`, Next on 3333, CDP 9333, `DISPLAY=:1` (Xtigervnc on this VM, not Xvfb).
- `~/Desktop/Traces Notes` did not exist before, during, or after.
- Doctor OK at `doctor-1.txt` (before the first drive), `doctor-2.txt` (after the first failed drive command and before re-driving harness fixes), `doctor-final.txt` (before the first teardown), `doctor-relaunch.txt` (after the second launch with the fixed `launch.sh`).
- Cleanup ran twice. Both times it removed the scratch dir, left this directory in place, and left no `electron .` or `next dev` process behind.

## Coverage

Each feature file was read from source by one read-only subagent and every feature was driven live at least once. Per-feature details are in `*/ENTRY.txt`.

- search: click focus, Control+F with Files expanded, `alpha` / `beta` / `volcano` filters, `Clear search`, empty fill, open Alpha from the filtered tree, query persistence across collapse, Control+F with Files collapsed.
- notes-editor: create from Files header / Control+N / empty-editor CTA / header `New note`, Escape cancel, autosave to disk, status bar, `.cm-line:last-child` append, preview, light/dark toggle, wiki-link follow, alias, ambiguous fill, unresolved create, heading rename, right-click Delete with confirm, close tabs, Collapse notes and Control+3, Open AI Chat and Control+4, Control+N with Files collapsed.
- graph: Galaxy, Terrain, Cluster, Particle, five shapes, zoom, fullscreen via button / Control+\ / Escape / Exit fullscreen, collapse via button and Control+2, empty-vault overlay and its `New Note`, Settings > Graph `Low Power Mode` switch.
- pages-site: `pages-check.sh` exit 0 with the extended assertions; live HTML byte-identical to `docs/index.html`.

## Harness fixes proven live

- `launch.sh` Electron precheck: with `node_modules/electron/dist` hidden, main's `-x` test passed while the new `--version` test refused before creating anything; restored, the relaunch went through.
- `drive.mjs fill --value ""` now clears the box (main typed `true`).
- `drive.mjs click --text` under a filter lands on the row `SPAN` and opens the note (main hit the tree container `DIV`).
- Snapshot `filesText` is scoped to the Files panel; body `text` still carries graph labels.
- `click --button right` and `--accept-dialog` drive the row menu Delete through `window.confirm`.
- `pages-check.sh` extra needles all present live.

## Product gaps, not edited

1. Control+F and Control+N do nothing while Files is collapsed. `FileTree` owns both listeners and intends to expand the sidebar (`src/components/sidebar/FileTree.tsx:23-35`), but `AppShell` unmounts it when collapsed (`src/components/layout/AppShell.tsx:342-353`). Screenshots: `search/collapsed-ctrl-f.png`, `notes-editor/collapsed-ctrl-n-no-expand.png`.
2. `docs/webmcp.js:41` answers `Node 18+`; `docs/index.html:210` says Node 22.
