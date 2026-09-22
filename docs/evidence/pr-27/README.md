# PR #27 Before/After proof

Evidence for [PR #27](https://github.com/Sdefendre/traces-app/pull/27)
"Keep the graph steady and voice calls intact", merged as `e6bd57c` (squash of head `5f46dae`).

- **Before** = `main` @ `3b2b22a`, the merge base of #27 (pre-fix).
- **After** = #27 head `5f46dae` / squash `e6bd57c` (identical tree).

Each composite has a red **BEFORE** row and a green **AFTER** row with the commit in the banner.
Same viewport for every frame: 1802 x 1073 CSS px (1774 x 1057 px in the PNG).

## Items

| # | Change in #27 | Composite | What to look for |
| --- | --- | --- | --- |
| 1 | Galaxy layout keeps its places on save (`useForceGraph.ts` reuses positions) | `galaxy-before-after-graph-panel.png`, `galaxy-before-after.png` | Before: after saving a note every node lands somewhere new. After: identical layout. |
| 2a | Zoom buttons start from the scroll-wheel distance (`KnowledgeGraph.tsx` `onChange` + `CameraController`) | `zoom-buttons-follow-wheel-before-after.png` | Wheel in, then click Zoom out once. Before: camera jumps out past where it started (stored `zoomDistance` 160 x 1.35). After: one step out from the wheel position. |
| 2b | Clicking empty space clears the selected node (`onPointerMissed`) | `empty-click-clears-selection-before-after.png` | Click a node, wheel back out, click empty space, add a note. Before: the still-selected node drags the camera back to itself. After: camera does not move. |
| 3 | Fullscreen swallows panel shortcuts (`AppShell.tsx` key handler) | `fullscreen-shortcut-before-after.png` | Graph fullscreen, press Ctrl+2, exit fullscreen. Before: Graph panel is collapsed (`canvases: 0`, `Expand graph` tab). After: Graph panel still open. |
| 4 | Settings gear stays off the collapsed-panel strip (`AppShell.tsx` `left`) | `settings-gear-off-strip-before-after.png` | Collapse the Files sidebar. Before: gear at x 12-42, inside the 74 px strip that holds the FILES / CHAT tabs. After: gear at x 87-117. |

Single frames for item 1 (`before-main-*`, `after-pr27-*`) carry a banner with the commit. `metrics/` holds the
numbers printed on the composites: label-spread measurements for zoom and selection, `getBoundingClientRect` of the
gear and the strip tabs, and the fullscreen DOM state (`canvases`, `Expand graph` tab, `Collapse graph panel` button).

## How it was captured

- Real Electron window driven over CDP with the repo's `verify-traces` skill
  (`.cursor/skills/verify-traces/helpers/launch.sh`, isolated `HOME`, scratch vault, `--disable-gpu`).
- Scratch vault: 13 `Verify *` notes. `Verify Hub` links to four notes, two link chains, `Verify Lambda` is standalone.
- Identical scripts for both builds, only the checkout differed. Two launches per build: one for item 1, one for
  items 2-4 (shell flows first, because fullscreen remounts the graph, then Auto Rotate off via Settings > Graph so the
  camera holds still, then the graph flows).
- Scroll wheel and canvas clicks were sent with CDP `Input.dispatchMouseEvent`. A node is located from its label
  overlay (`Html` from drei) and clicked 26 px below the label centre. "Empty space" is the bottom-left corner of the
  graph panel.
- Zoom is measured as the bounding box of the 13 label overlays, so the numbers on the composites are in screen px.
- The software renderer runs at ~4 fps, so the 60-frame fly-to after a node click takes ~15 s; waits are sized for that.
- Every instance was stopped with `helpers/cleanup.sh`. Ports 3333 and 9333 free afterwards.

## Not captured

Cluster View draws an empty scene in this VM. Under software WebGL (SwiftShader, `--disable-gpu`) switching to Cluster
logs `THREE.WebGLRenderer: Context Lost` on both `main` and the PR head. That is an environment limit, not a product
finding. The Cluster fix in #27 (`useClusterLayout.ts`, radius from a hash of the note id instead of `Math.random()`)
is deterministic by construction.
