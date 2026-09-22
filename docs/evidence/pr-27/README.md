# PR #27 Before/After proof: Galaxy layout stays put on save

Evidence for [PR #27](https://github.com/Sdefendre/traces-app/pull/27)
"Keep the graph steady and voice calls intact", merged as `e6bd57c` (squash of head `5f46dae`).

## What is shown

| File | Build | Moment |
| --- | --- | --- |
| `before-main-galaxy-1-settled.png` | `main` @ `3b2b22a` (merge base, pre-fix) | Galaxy view settled, no note open |
| `before-main-galaxy-2-after-save.png` | `main` @ `3b2b22a` | Same window ~12 s after saving `Verify Lambda.md`. Nodes moved to new random places. |
| `after-pr27-galaxy-1-settled.png` | PR #27 head @ `5f46dae` | Galaxy view settled, no note open |
| `after-pr27-galaxy-2-after-save.png` | PR #27 head @ `5f46dae` | Same window ~12 s after the same save. Every node kept its place. |
| `galaxy-before-after.png` | both | 2x2 composite of the four full-window shots at 50 % |
| `galaxy-before-after-graph-panel.png` | both | 2x2 composite cropped to the graph panel at 100 % |
| `*-galaxy-2-after-save.snapshot.json` | both | `drive.mjs snapshot` after the save: `Galaxy View` has `aria-pressed="true"`, `canvases: 1` |

Each PNG carries a red **BEFORE** or green **AFTER** banner with the commit it was taken from.

## How it was captured

- Real Electron window driven over CDP with the repo's `verify-traces` skill
  (`.cursor/skills/verify-traces/helpers/launch.sh`, isolated `HOME`, scratch vault, `--disable-gpu`).
- Same viewport for every shot: 1802 x 1073 CSS px (1774 x 1057 device px in the PNG).
- Identical script for both runs. Only the repo checkout differed.
- Scratch vault: 13 `Verify *` notes. `Verify Hub` links to four notes, two link chains, `Verify Lambda` is standalone.
- Steps per run:
  1. Settings > Graph > **Auto Rotate** off (through the real switch), so the camera does not move between shots.
  2. Click **Galaxy View**, wait 14 s for the force layout to settle, screenshot 1.
  3. Click `Verify Lambda` in Files, append two lines in the editor. Auto-save (800 ms) writes the file, the vault watcher rebuilds the graph, the force layout re-runs.
  4. Wait 12 s, screenshot 2. Confirm the edit on disk with `drive.mjs read-vault`.
  5. `helpers/cleanup.sh`. Ports 3333 and 9333 free afterwards.

## Not captured

Cluster View could not be captured in this VM. Under software WebGL (SwiftShader, `--disable-gpu`) switching to
Cluster logs `THREE.WebGLRenderer: Context Lost` and draws an empty scene on both `main` and the PR head. That is an
environment limit, not a product finding. The Cluster fix in #27 (`useClusterLayout.ts`, radius from a hash of the
note id instead of `Math.random()`) is deterministic by construction.
