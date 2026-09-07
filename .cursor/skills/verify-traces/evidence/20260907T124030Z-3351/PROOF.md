# Maintain pass: verify-traces

Run 2026-09-07 on commit cfad153 (main). Isolated HOME `/tmp/traces-verify-20260907T124030Z-3351/home`, CDP 9333. `~/Desktop` did not exist before or after the run.

Doctor passed before the first drive (`doctor-1.txt`) and after the first failed drive (`doctor-2.txt`).

## Features covered live

- search: click focus, Control+F with Files expanded, `alpha` / `beta` / `volcano` filters, `Clear search`, empty fill, open Alpha and Beta from the filtered tree. Evidence in `search/`.
- graph: Galaxy, Terrain, Cluster, Particle, all five particle shapes, zoom, fullscreen and exit, Escape exit, collapse and expand, Control+2, Control+\, empty-vault overlay. Evidence in `graph/`.
- notes-editor: close tabs to empty state, create from empty-editor CTA and Files header, status bar, autosave to disk, append via `.cm-line:last-child`, preview, alias link, ambiguous link fills search, heading rename on disk, light/dark toggle, Control+N and Escape, right-click Delete with confirm, second delete to reach empty vault. Evidence in `notes-editor/`.
- pages-site: `pages-check.sh` ok, live HTML identical to `docs/index.html`. Evidence in `pages/`.

## Harness gaps fixed during the run, each re-driven

1. `launch.sh` accepted the Electron wrapper as proof of the binary. First launch died late with "Electron failed to install correctly". Precheck now runs `electron --version`; proven with `node_modules/electron/dist` hidden (dies first, no residue) and restored (launches).
2. `drive.mjs click --text` took the first match in document order. With one filtered row the tree container matched and the click hit empty space. Smallest-area picked a graph label, then the CodeMirror widget. Final rule: first clickable leaf match in document order, skipping `pointer-events: none`.
3. `drive.mjs` parsed `--value ""` as a boolean and typed `true` into search.
4. Snapshot gained `filesText`. Body text always names every note because graph labels are DOM overlays.
5. `click --button right` and `--accept-dialog` added so the row menu Delete can be driven through its `window.confirm`.

## Product gap, not edited

Control+F while Files is collapsed does nothing. `FileTree` owns the `traces:focus-search` listener and AppShell unmounts it when collapsed (`src/components/layout/AppShell.tsx:353`, `src/components/sidebar/FileTree.tsx:31-36,50`). Control+1 and Control+F with Files expanded work through the same harness. `search/collapsed-ctrl-f-no-expand.png`. The map still states the intended behavior.

## Setup on disk, not proof

Seeded `Verify Index.md` twice for the ambiguous-link recipe. Removed remaining notes on disk to reach the empty vault after two UI deletes. Restored Alpha and Beta before teardown.
